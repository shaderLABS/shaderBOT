import { UserResolvable } from 'discord.js';
import { db } from '../../../db/postgres.js';
import { client, timeoutStore } from '../../bot.js';
import { BanAppeal } from '../banAppeal.js';
import { sendInfo } from '../embeds.js';
import log from '../log.js';
import { getGuild, parseUser } from '../misc.js';
import { formatTimeDate, secondsToString } from '../time.js';
import { ExpirablePunishment, LiftedPunishment } from './main.js';

export class Ban extends ExpirablePunishment {
    readonly TYPE_STRING: string = 'Ban';

    async refresh() {
        return await Ban.getByUUID(this.id);
    }

    static async has(userID: string): Promise<boolean> {
        const result = await db.query({ text: /*sql*/ `SELECT 1 FROM punishment WHERE "type" = 'ban' AND user_id = $1;`, values: [userID], name: 'ban-has' });
        return Boolean(result.rows[0]);
    }

    static async getByUUID(uuid: string) {
        const result = await db.query({ text: /*sql*/ `SELECT * FROM punishment WHERE "type" = 'ban' AND id = $1;`, values: [uuid], name: 'ban-uuid' });
        if (result.rowCount === 0) return Promise.reject('A ban with the specified UUID does not exist.');
        return new Ban(result.rows[0]);
    }

    static async getByUserID(userID: string) {
        const result = await db.query({ text: /*sql*/ `SELECT * FROM punishment WHERE "type" = 'ban' AND user_id = $1;`, values: [userID], name: 'ban-user-id' });
        if (result.rowCount === 0) return Promise.reject('The specified user does not have any past bans.');
        return new Ban(result.rows[0]);
    }

    static async getExpiringToday() {
        const result = await db.query({
            text: /*sql*/ `
            	SELECT * FROM punishment
            	WHERE "type" = 'ban' AND expire_timestamp IS NOT NULL AND expire_timestamp::DATE <= NOW()::DATE;`,
            name: 'ban-expiring-today',
        });

        return result.rows.map((row) => new Ban(row));
    }

    static async getExpiringTomorrow() {
        const result = await db.query({
            text: /*sql*/ `
            	SELECT * FROM punishment
            	WHERE "type" = 'ban' AND expire_timestamp IS NOT NULL AND expire_timestamp::DATE <= NOW()::DATE + INTERVAL '1 day';`,
            name: 'ban-expiring-tomorrow',
        });

        return result.rows.map((row) => new Ban(row));
    }

    public static async create(userResolvable: UserResolvable, reason: string, duration?: number, moderatorID?: string, contextURL?: string, deleteMessageSeconds?: number) {
        if (duration) {
            if (isNaN(duration)) return Promise.reject('The specified duration is not a number or exceeds the range of UNIX time.');
            if (duration < 10) return Promise.reject("You can't ban someone for less than 10 seconds.");
        }

        if (reason.length > 512) return Promise.reject('The ban reason must not be more than 512 characters long.');

        const guild = getGuild();

        const user = await client.users.fetch(userResolvable).catch(() => undefined);
        if (!user) return Promise.reject('Failed to resolve the user.');

        const overwrittenBan = await Ban.getByUserID(user.id).catch(() => undefined);
        await overwrittenBan?.move(moderatorID);

        const timestamp = new Date();
        const expireTimestamp = duration ? new Date(timestamp.getTime() + duration * 1000) : undefined;

        const result = await db.query({
            text: /*sql*/ `
            	INSERT INTO punishment (user_id, "type", mod_id, reason, context_url, expire_timestamp, timestamp)
            	VALUES ($1, 'ban', $2, $3, $4, $5, $6)
            	RETURNING id;`,
            values: [user.id, moderatorID, reason, contextURL, expireTimestamp, timestamp],
            name: 'ban-create',
        });

        if (result.rowCount === 0) return Promise.reject('Failed to insert ban entry.');
        const { id } = result.rows[0];

        const ban = new Ban({
            id,
            reason,
            timestamp,
            user_id: user.id,
            context_url: contextURL,
            mod_id: moderatorID,
            expire_timestamp: expireTimestamp,
        });

        let sentDM = true;
        await sendInfo(user, ban.toString(false), `You have been banned from ${guild.name}.`).catch(() => {
            sentDM = false;
        });

        if (await guild.bans.fetch(user).catch(() => undefined)) {
            // is banned
            if (deleteMessageSeconds) {
                await guild.members.unban(user, 'Rebanning an already banned user in order to delete their messages.');
                await guild.members.ban(user, { reason, deleteMessageSeconds });
            }
        } else {
            // is not banned
            await guild.members.ban(user, { reason, deleteMessageSeconds });
        }

        timeoutStore.set(ban, true);

        let logString = `${parseUser(user)} has been ${duration ? `temporarily banned for ${secondsToString(duration)}.` : 'permanently banned.'}\n\n${ban.toString()}`;
        if (overwrittenBan) logString += '\n\nTheir previous ban has been overwritten:\n' + overwrittenBan.toString();
        if (!sentDM) logString += '\n\n*They did not receive a DM.*';

        log(logString, duration ? 'Temporary Ban' : 'Permanent Ban');
        return logString;
    }

    private async move(liftedModeratorID?: string) {
        const liftedBan = LiftedBan.fromBan(this, liftedModeratorID);

        const result = await db.query({
            text: /*sql*/ `
            	WITH moved_rows AS (
            	    DELETE FROM punishment
            	    WHERE id = $1
            	    RETURNING id, user_id, type, mod_id, reason, context_url, edited_timestamp, edited_mod_id, expire_timestamp, timestamp
            	)
            	INSERT INTO past_punishment (id, user_id, type, mod_id, reason, context_url, edited_timestamp, edited_mod_id, lifted_timestamp, lifted_mod_id, timestamp)
            	SELECT id, user_id, type, mod_id, reason, context_url, edited_timestamp, edited_mod_id, $2::TIMESTAMP AS lifted_timestamp, $3::NUMERIC AS lifted_mod_id, timestamp FROM moved_rows;`,
            values: [liftedBan.id, liftedBan.liftedTimestamp, liftedBan.liftedModeratorID],
            name: 'ban-move-entry',
        });

        if (result.rowCount === 0) return Promise.reject('Failed to move entry.');

        timeoutStore.delete(this);
        return liftedBan;
    }

    public async lift(liftedModeratorID?: string): Promise<string> {
        const guild = getGuild();
        const liftedBan = await this.move(liftedModeratorID);

        await guild.members.unban(this.userID).catch(() => undefined);

        let logString = `${parseUser(this.userID)} has been unbanned.`;
        if (this.expireTimestamp) logString += `\nTheir temporary ban would have expired at ${formatTimeDate(this.expireTimestamp)}.`;
        logString += '\n\n' + liftedBan.toString();

        log(logString, 'Unban');
        return logString;
    }

    public async expire() {
        const guild = getGuild();

        try {
            await this.move();

            await guild.members.unban(this.userID).catch(() => undefined);

            const appeal = await BanAppeal.getPendingByUserID(this.userID).catch(() => undefined);
            if (appeal) await appeal.expire();

            log(`${parseUser(this.userID)}'s temporary ban (${this.id}) has expired.`, 'Expire Temporary Ban');
        } catch (error) {
            console.error(error);
            log(`An error occurred while trying to expire ${parseUser(this.userID)}'s temporary ban (${this.id}).`, 'Expire Temporary Ban');
        }
    }

    public async editDuration(duration: number, moderatorID: string) {
        if (isNaN(duration)) return Promise.reject('The specified duration is not a number or exceeds the range of UNIX time.');
        if (duration < 10) return Promise.reject("You can't ban someone for less than 10 seconds.");

        const oldExpireTimestamp = this.expireTimestamp;
        const newExpireTimestamp = new Date(this.timestamp.getTime() + duration * 1000);

        const editTimestamp = new Date();

        const result = await db.query({
            text: /*sql*/ `
            	UPDATE punishment
            	SET expire_timestamp = $1, edited_timestamp = $2, edited_mod_id = $3
            	WHERE id = $4;`,
            values: [newExpireTimestamp, editTimestamp, moderatorID, this.id],
            name: 'ban-edit-duration',
        });

        if (result.rowCount === 0) return Promise.reject('Failed to edit the duration of the ban.');

        this.expireTimestamp = newExpireTimestamp;
        this.editTimestamp = editTimestamp;
        this.editModeratorID = moderatorID;

        timeoutStore.delete(this);
        timeoutStore.set(this, true);

        const logString = `${parseUser(this.editModeratorID)} edited the expiry date of ${parseUser(this.userID)}'s current ban (${this.id}).\n\n**Before**\n${
            oldExpireTimestamp ? formatTimeDate(oldExpireTimestamp) + ` (${secondsToString((oldExpireTimestamp.getTime() - this.timestamp.getTime()) / 1000)})` : 'Permanent'
        }\n\n**After**\n${formatTimeDate(newExpireTimestamp)} (${secondsToString((newExpireTimestamp.getTime() - this.timestamp.getTime()) / 1000)})`;

        log(logString, 'Edit Ban Duration');
        return logString;
    }

    public async editReason(newReason: string, editModeratorID: string) {
        if (newReason.length > 512) return Promise.reject('The ban reason must not be more than 512 characters long.');

        const oldReason = this.reason;
        const editTimestamp = new Date();

        const result = await db.query({
            text: /*sql*/ `
            	UPDATE punishment
            	SET reason = $1, edited_timestamp = $2, edited_mod_id = $3
            	WHERE id = $4;`,
            values: [newReason, editTimestamp, editModeratorID, this.id],
            name: 'ban-edit-reason',
        });
        if (result.rowCount === 0) return Promise.reject('Failed to edit the reason of the ban.');

        this.reason = newReason;
        this.editTimestamp = editTimestamp;
        this.editModeratorID = editModeratorID;

        const logString = `${parseUser(this.editModeratorID)} edited the reason of ${parseUser(this.userID)}'s current ban (${this.id}).\n\n**Before**\n${oldReason}\n\n**After**\n${newReason}`;

        log(logString, 'Edit Ban Reason');
        return logString;
    }
}

export class LiftedBan extends LiftedPunishment {
    readonly TYPE_STRING: string = 'Lifted Ban';

    public static fromBan(ban: Ban, liftedModeratorID?: string) {
        return new LiftedBan({
            id: ban.id,
            user_id: ban.userID,
            mod_id: ban.moderatorID,
            reason: ban.reason,
            context_url: ban.contextURL,
            edited_timestamp: ban.editTimestamp,
            edited_mod_id: ban.editModeratorID,
            lifted_timestamp: new Date(),
            lifted_mod_id: liftedModeratorID,
            timestamp: ban.timestamp,
        });
    }

    static async getByUUID(uuid: string) {
        const result = await db.query({ text: /*sql*/ `SELECT * FROM past_punishment WHERE "type" = 'ban' AND id = $1;`, values: [uuid], name: 'lifted-ban-uuid' });
        if (result.rowCount === 0) return Promise.reject('A lifted ban with the specified UUID does not exist.');
        return new LiftedBan(result.rows[0]);
    }

    static async getLatestByUserID(userID: string) {
        const result = await db.query({
            text: /*sql*/ `SELECT * FROM past_punishment WHERE "type" = 'ban' AND user_id = $1 ORDER BY timestamp DESC LIMIT 1;`,
            values: [userID],
            name: 'lifted-ban-latest-user-id',
        });
        if (result.rowCount === 0) return Promise.reject('The specified user does not have any lifted bans.');
        return new LiftedBan(result.rows[0]);
    }

    static async getAllByUserID(userID: string) {
        const result = await db.query({
            text: /*sql*/ `SELECT * FROM past_punishment WHERE "type" = 'ban' AND user_id = $1 ORDER BY timestamp DESC;`,
            values: [userID],
            name: 'lifted-ban-all-user-id',
        });
        return result.rows.map((row) => new LiftedBan(row));
    }

    public async editReason(newReason: string, moderatorID: string) {
        if (newReason.length > 512) return Promise.reject('The ban reason must not be more than 512 characters long.');

        const oldReason = this.reason;
        const editTimestamp = new Date();

        const result = await db.query({
            text: /*sql*/ `
            	UPDATE past_punishment
            	SET reason = $1, edited_timestamp = $2, edited_mod_id = $3
            	WHERE id = $4;`,
            values: [newReason, editTimestamp, moderatorID, this.id],
            name: 'lifted-ban-edit-reason',
        });
        if (result.rowCount === 0) return Promise.reject('Failed to edit the reason of the lifted ban.');

        this.reason = newReason;
        this.editTimestamp = editTimestamp;
        this.editModeratorID = moderatorID;

        const logString = `${parseUser(this.editModeratorID)} edited the reason of ${parseUser(this.userID)}'s lifted ban (${this.id}).\n\n**Before**\n${oldReason}\n\n**After**\n${newReason}`;

        log(logString, 'Edit Lifted Ban Reason');
        return logString;
    }

    public async delete(moderatorID: string) {
        const result = await db.query({ text: /*sql*/ `DELETE FROM past_punishment WHERE id = $1;`, values: [this.id], name: 'lifted-ban-delete' });
        if (result.rowCount === 0) return Promise.reject('Failed to delete lifted ban.');

        const logString = `${parseUser(moderatorID)} deleted the log entry of ${parseUser(this.userID)}'s lifted ban.\n\n${this.toString(true)}`;
        log(logString, 'Delete Lifted Ban Entry');
        return logString;
    }
}
