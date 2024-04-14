import { UserResolvable } from 'discord.js';
import { db } from '../../../db/postgres.js';
import { client } from '../../bot.js';
import log from '../log.js';
import { parseUser } from '../misc.js';
import { Punishment } from './main.js';

export class Track extends Punishment {
    readonly TYPE_STRING: string = 'Track';

    static async getByUUID(uuid: string) {
        const result = await db.query({ text: /*sql*/ `SELECT * FROM track WHERE id = $1;`, values: [uuid], name: 'track-uuid' });
        if (result.rowCount === 0) return Promise.reject('A track entry with the specified UUID does not exist.');
        return new Track(result.rows[0]);
    }

    static async getByUserID(userID: string) {
        const result = await db.query({ text: /*sql*/ `SELECT * FROM track WHERE user_id = $1;`, values: [userID], name: 'track-user-id' });
        if (result.rowCount === 0) return Promise.reject('The specified user does not have any track entries.');
        return new Track(result.rows[0]);
    }

    static async create(userResolvable: UserResolvable, reason: string, moderatorID?: string, contextURL?: string) {
        if (reason.length > 512) return Promise.reject('The track entry reason must not be more than 512 characters long.');

        const user = await client.users.fetch(userResolvable).catch(() => undefined);
        if (!user) return Promise.reject('Failed to resolve the user.');
        const timestamp = new Date();

        const result = await db.query({
            text: /*sql*/ `
            	INSERT INTO track (user_id, mod_id, reason, context_url, timestamp)
            	VALUES ($1, $2, $3, $4, $5)
            	RETURNING id;`,
            values: [user.id, moderatorID, reason, contextURL, timestamp],
            name: 'track-create',
        });

        if (result.rowCount === 0) return Promise.reject('Failed to insert track entry.');
        const { id } = result.rows[0];

        const track = new Track({
            id,
            user_id: user.id,
            mod_id: moderatorID,
            timestamp,
            reason,
            context_url: contextURL,
        });

        let logString = `${parseUser(user)} will be tracked.\n\n${track.toString()}`;

        log(logString, 'Create Track');
        return logString;
    }

    public async editReason(newReason: string, moderatorID: string) {
        if (newReason.length > 512) return Promise.reject('The track entry reason must not be more than 512 characters long.');

        const previousReason = this.reason;
        const editTimestamp = new Date();

        const result = await db.query({
            text: /*sql*/ `
            	UPDATE track
            	SET reason = $1, edited_timestamp = $2, edited_mod_id = $3
            	WHERE id = $4;`,
            values: [newReason, editTimestamp, moderatorID, this.id],
            name: 'track-edit-reason',
        });

        if (result.rowCount === 0) return Promise.reject('Failed to edit the reason of the specified track entry.');

        this.reason = newReason;
        this.editTimestamp = editTimestamp;
        this.editModeratorID = moderatorID;

        const logString = `${parseUser(this.editModeratorID)} edited the reason of ${parseUser(this.userID)}'s track entry (${this.id}).\n\n**Before**\n${previousReason}\n\n**After**\n${newReason}`;

        log(logString, 'Edit Track Reason');
        return logString;
    }

    public async delete(moderatorID: string) {
        const result = await db.query({ text: /*sql*/ `DELETE FROM track WHERE id = $1;`, values: [this.id], name: 'track-delete' });
        if (result.rowCount === 0) return Promise.reject('Failed to delete track entry.');

        const logString = `${parseUser(moderatorID)} deleted the log entry of ${parseUser(this.userID)}'s track entry.\n\n${this.toString()}`;
        log(logString, 'Delete Track');
        return logString;
    }
}
