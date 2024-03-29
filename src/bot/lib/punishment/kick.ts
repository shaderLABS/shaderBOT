import { UserResolvable } from 'discord.js';
import { db } from '../../../db/postgres.js';
import { client } from '../../bot.js';
import { sendInfo } from '../embeds.js';
import log from '../log.js';
import { getGuild, parseUser, userToMember } from '../misc.js';
import { Punishment } from './main.js';

export class Kick extends Punishment {
    readonly TYPE_STRING: string = 'Kick';

    static async getByUUID(uuid: string) {
        const result = await db.query({ text: /*sql*/ `SELECT * FROM kick WHERE id = $1;`, values: [uuid], name: 'kick-uuid' });
        if (result.rowCount === 0) return Promise.reject('A kick with the specified UUID does not exist.');
        return new Kick(result.rows[0]);
    }

    static async getLatestByUserID(userID: string) {
        const result = await db.query({
            text: /*sql*/ `SELECT * FROM kick WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 1;`,
            values: [userID],
            name: 'kick-latest-user-id',
        });
        if (result.rowCount === 0) return Promise.reject('The specified user does not have any kicks.');
        return new Kick(result.rows[0]);
    }

    static async getAllByUserID(userID: string) {
        const result = await db.query({ text: /*sql*/ `SELECT * FROM kick WHERE user_id = $1 ORDER BY timestamp DESC;`, values: [userID], name: 'kick-all-user-id' });
        return result.rows.map((row) => new Kick(row));
    }

    static async create(userResolvable: UserResolvable, reason: string, moderatorID?: string, contextURL?: string, deleteMessageSeconds?: number) {
        if (reason.length > 512) return Promise.reject('The kick reason must not be more than 512 characters long.');

        const guild = getGuild();

        const user = await client.users.fetch(userResolvable).catch(() => undefined);
        if (!user) return Promise.reject('Failed to resolve the user.');

        const member = await userToMember(user.id, guild);
        const timestamp = new Date();

        const result = await db.query({
            text: /*sql*/ `
            	INSERT INTO kick (user_id, mod_id, reason, context_url, timestamp)
            	VALUES ($1, $2, $3, $4, $5)
            	RETURNING id;`,
            values: [user.id, moderatorID, reason, contextURL, timestamp],
            name: 'kick-create',
        });

        if (result.rowCount === 0) return Promise.reject('Failed to insert kick entry.');
        const { id } = result.rows[0];

        const kick = new Kick({
            id,
            user_id: user.id,
            mod_id: moderatorID,
            timestamp,
            reason,
            context_url: contextURL,
        });

        let sentDM = true;
        await sendInfo(user, kick.toString(false), `You have been kicked from ${guild.name}.`).catch(() => {
            sentDM = false;
        });

        if (deleteMessageSeconds) {
            if (await guild.bans.fetch(user).catch(() => undefined)) {
                await guild.members.unban(user, reason);
                await guild.members.ban(user, { reason, deleteMessageSeconds });
            } else {
                await guild.members.ban(user, { reason, deleteMessageSeconds });
                await guild.members.unban(user, reason);
            }
        } else {
            await member?.kick(reason);
        }

        let logString = `${parseUser(user)} has been kicked.\n\n${kick.toString()}`;
        if (!sentDM) logString += '\n\n*They did not receive a DM.*';

        log(logString, 'Kick');
        return logString;
    }

    public async editReason(newReason: string, moderatorID: string) {
        if (newReason.length > 512) return Promise.reject('The kick reason must not be more than 512 characters long.');

        const previousReason = this.reason;
        const editTimestamp = new Date();

        const result = await db.query({
            text: /*sql*/ `
            	UPDATE kick
            	SET reason = $1, edited_timestamp = $2, edited_mod_id = $3
            	WHERE id = $4;`,
            values: [newReason, editTimestamp, moderatorID, this.id],
            name: 'kick-edit-reason',
        });

        if (result.rowCount === 0) return Promise.reject('Failed to edit the reason of the specified kick.');

        this.reason = newReason;
        this.editTimestamp = editTimestamp;
        this.editModeratorID = moderatorID;

        const logString = `${parseUser(this.editModeratorID)} edited the reason of ${parseUser(this.userID)}'s kick (${this.id}).\n\n**Before**\n${previousReason}\n\n**After**\n${newReason}`;

        log(logString, 'Edit Kick Reason');
        return logString;
    }

    public async delete(moderatorID: string) {
        const result = await db.query({ text: /*sql*/ `DELETE FROM kick WHERE id = $1;`, values: [this.id], name: 'kick-delete' });
        if (result.rowCount === 0) return Promise.reject('Failed to delete past punishment.');

        const logString = `${parseUser(moderatorID)} deleted the log entry of ${parseUser(this.userID)}'s kick.\n\n${this.toString()}`;
        log(logString, 'Delete Kick');
        return logString;
    }
}
