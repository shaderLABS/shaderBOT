import { type UserResolvable } from 'discord.js';
import { db } from '../../../db/postgres.ts';
import { client, timeoutStore } from '../../bot.ts';
import { sendInfo } from '../embeds.ts';
import log from '../log.ts';
import { getGuild, parseUser, userToMember } from '../misc.ts';
import { formatTimeDate, secondsToString } from '../time.ts';
import { ExpirablePunishment, LiftedPunishment } from './main.ts';

export class Mute extends ExpirablePunishment {
    readonly TYPE_STRING: string = 'Mute';

    declare expireTimestamp: Date;

    async refresh() {
        return await Mute.getByUUID(this.id);
    }

    static async has(userID: string): Promise<boolean> {
        const result = await db.query({ text: /*sql*/ `SELECT 1 FROM mute WHERE user_id = $1;`, values: [userID], name: 'mute-has' });
        return Boolean(result.rows[0]);
    }

    static async getByUUID(uuid: string) {
        const result = await db.query({ text: /*sql*/ `SELECT * FROM mute WHERE id = $1;`, values: [uuid], name: 'mute-uuid' });
        if (result.rowCount === 0) return Promise.reject('A mute with the specified UUID does not exist.');
        return new Mute(result.rows[0]);
    }

    static async getByUserID(userID: string) {
        const result = await db.query({ text: /*sql*/ `SELECT * FROM mute WHERE user_id = $1;`, values: [userID], name: 'mute-user-id' });
        if (result.rowCount === 0) return Promise.reject('The specified user does not have any past mutes.');
        return new Mute(result.rows[0]);
    }

    static async getExpiringToday() {
        const result = await db.query({
            text: /*sql*/ `
            	SELECT * FROM mute
            	WHERE expire_timestamp IS NOT NULL AND expire_timestamp::DATE <= NOW()::DATE;`,
            name: 'mute-expiring-today',
        });

        return result.rows.map((row) => new Mute(row));
    }

    static async getExpiringTomorrow() {
        const result = await db.query({
            text: /*sql*/ `
            	SELECT * FROM mute
            	WHERE expire_timestamp IS NOT NULL AND expire_timestamp::DATE <= NOW()::DATE + INTERVAL '1 day';`,
            name: 'mute-expiring-tomorrow',
        });

        return result.rows.map((row) => new Mute(row));
    }

    private async move(liftedModeratorID?: string) {
        const liftedMute = LiftedMute.fromMute(this, liftedModeratorID);

        const result = await db.query({
            text: /*sql*/ `
            	WITH moved_rows AS (
            	    DELETE FROM mute
            	    WHERE id = $1
            	    RETURNING id, user_id, mod_id, reason, context_url, edited_timestamp, edited_mod_id, timestamp
            	)
            	INSERT INTO lifted_mute (id, user_id, mod_id, reason, context_url, edited_timestamp, edited_mod_id, lifted_timestamp, lifted_mod_id, timestamp)
            	SELECT id, user_id, mod_id, reason, context_url, edited_timestamp, edited_mod_id, $2::TIMESTAMP AS lifted_timestamp, $3::NUMERIC AS lifted_mod_id, timestamp FROM moved_rows;`,
            values: [liftedMute.id, liftedMute.liftedTimestamp, liftedMute.liftedModeratorID],
            name: 'mute-move-entry',
        });

        if (result.rowCount === 0) return Promise.reject('Failed to move entry.');

        timeoutStore.delete(this);
        return liftedMute;
    }

    public async lift(liftedModeratorID?: string): Promise<string> {
        const guild = getGuild();
        const pastPunishment = await this.move(liftedModeratorID);

        const member = await userToMember(this.userID, guild);
        if (member) member.timeout(null);

        let logString = `${parseUser(this.userID)} has been unmuted.`;
        if (this.expireTimestamp) logString += `\nTheir mute would have expired at ${formatTimeDate(this.expireTimestamp)}.`;
        logString += '\n\n' + pastPunishment.toString();

        log(logString, 'Unmute');
        return logString;
    }

    public async expire() {
        try {
            await this.move();

            // timeout is lifted by discord
            log(`${parseUser(this.userID)}'s mute (${this.id}) has expired.`, 'Expire Mute');
        } catch (error) {
            console.error(error);
            log(`An error occurred while trying to expire ${parseUser(this.userID)}'s mute (${this.id}).`, 'Expire Mute');
        }
    }

    public async editDuration(duration: number, editModeratorID: string) {
        if (isNaN(duration)) return Promise.reject('The specified duration is not a number or exceeds the range of UNIX time.');
        if (duration < 10) return Promise.reject("You can't mute someone for less than 10 seconds.");
        if (duration > 2419200) return Promise.reject("You can't mute someone for more than 28 days.");

        const oldExpireTimestamp = this.expireTimestamp;
        const newExpireTimestamp = new Date(this.timestamp.getTime() + duration * 1000);

        const editTimestamp = new Date();

        const result = await db.query({
            text: /*sql*/ `
            	UPDATE mute
            	SET expire_timestamp = $1, edited_timestamp = $2, edited_mod_id = $3
            	WHERE id = $4;`,
            values: [newExpireTimestamp, editTimestamp, editModeratorID, this.id],
            name: 'mute-edit-duration',
        });
        if (result.rowCount === 0) return Promise.reject('Failed to edit the duration of the mute.');

        this.expireTimestamp = newExpireTimestamp;
        this.editTimestamp = editTimestamp;
        this.editModeratorID = editModeratorID;

        const member = await userToMember(this.userID);
        if (member) member.disableCommunicationUntil(this.expireTimestamp);

        timeoutStore.delete(this);
        timeoutStore.set(this, true);

        const logString = `${parseUser(this.editModeratorID)} edited the expiry date of ${parseUser(this.userID)}'s current mute (${this.id}).\n\n**Before**\n${
            formatTimeDate(oldExpireTimestamp) + ` (${secondsToString((oldExpireTimestamp.getTime() - this.timestamp.getTime()) / 1000)})`
        }\n\n**After**\n${formatTimeDate(newExpireTimestamp)} (${secondsToString((newExpireTimestamp.getTime() - this.timestamp.getTime()) / 1000)})`;

        log(logString, 'Edit Mute Duration');
        return logString;
    }

    public async editReason(newReason: string, editModeratorID: string) {
        if (newReason.length > 512) return Promise.reject('The mute reason must not be more than 512 characters long.');

        const oldReason = this.reason;
        const editTimestamp = new Date();

        const result = await db.query({
            text: /*sql*/ `
            	UPDATE mute
            	SET reason = $1, edited_timestamp = $2, edited_mod_id = $3
            	WHERE id = $4;`,
            values: [newReason, editTimestamp, editModeratorID, this.id],
            name: 'mute-edit-reason',
        });
        if (result.rowCount === 0) return Promise.reject('Failed to edit the reason of the mute.');

        this.reason = newReason;
        this.editTimestamp = editTimestamp;
        this.editModeratorID = editModeratorID;

        const logString = `${parseUser(this.editModeratorID)} edited the reason of ${parseUser(this.userID)}'s current mute (${this.id}).\n\n**Before**\n${oldReason}\n\n**After**\n${newReason}`;

        log(logString, 'Edit Mute Reason');
        return logString;
    }

    public static async create(userResolvable: UserResolvable, reason: string, duration: number, moderatorID?: string, contextURL?: string) {
        if (isNaN(duration)) return Promise.reject('The specified duration is not a number or exceeds the range of UNIX time.');
        if (duration < 10) return Promise.reject("You can't mute someone for less than 10 seconds.");
        if (duration > 2419200) return Promise.reject("You can't mute someone for more than 28 days.");

        if (reason.length > 512) return Promise.reject('The mute reason must not be more than 512 characters long.');

        const guild = getGuild();

        const user = await client.users.fetch(userResolvable).catch(() => undefined);
        if (!user) return Promise.reject('Failed to resolve the user.');

        const member = await userToMember(user.id);

        const overwrittenMute = await Mute.getByUserID(user.id).catch(() => undefined);
        await overwrittenMute?.move(moderatorID);

        const timestamp = new Date();
        const expireTimestamp = duration ? new Date(timestamp.getTime() + duration * 1000) : undefined;

        const result = await db.query({
            text: /*sql*/ `
            	INSERT INTO mute (user_id, mod_id, reason, context_url, expire_timestamp, timestamp)
            	VALUES ($1, $2, $3, $4, $5, $6)
            	RETURNING id;`,
            values: [user.id, moderatorID, reason, contextURL, expireTimestamp, timestamp],
            name: 'mute-create',
        });

        if (result.rowCount === 0) return Promise.reject('Failed to insert mute.');
        const { id } = result.rows[0];

        const mute = new Mute({
            id,
            reason,
            timestamp,
            user_id: user.id,
            context_url: contextURL,
            mod_id: moderatorID,
            expire_timestamp: expireTimestamp,
        });

        let sentDM = true;
        await sendInfo(user, mute.toString(false), `You have been muted on ${guild.name}.`).catch(() => {
            sentDM = false;
        });

        if (member) member.timeout(duration * 1000, reason);
        timeoutStore.set(mute, true);

        let logString = `${parseUser(user)} has been muted for ${secondsToString(duration)}.\n\n${mute.toString()}`;
        if (overwrittenMute) logString += `\n\nTheir previous mute has been overwritten:\n` + overwrittenMute.toString();
        if (!sentDM) logString += '\n\n*They did not receive a DM.*';

        log(logString, 'Mute');
        return logString;
    }
}

export class LiftedMute extends LiftedPunishment {
    readonly TYPE_STRING: string = 'Lifted Mute';

    public static fromMute(mute: Mute, liftedModeratorID?: string) {
        return new LiftedMute({
            id: mute.id,
            user_id: mute.userID,
            mod_id: mute.moderatorID,
            reason: mute.reason,
            context_url: mute.contextURL,
            edited_timestamp: mute.editTimestamp,
            edited_mod_id: mute.editModeratorID,
            lifted_timestamp: new Date(),
            lifted_mod_id: liftedModeratorID,
            timestamp: mute.timestamp,
        });
    }

    static async getByUUID(uuid: string) {
        const result = await db.query({ text: /*sql*/ `SELECT * FROM lifted_mute WHERE id = $1;`, values: [uuid], name: 'lifted-mute-uuid' });
        if (result.rowCount === 0) return Promise.reject('A lifted mute with the specified UUID does not exist.');
        return new LiftedMute(result.rows[0]);
    }

    static async getLatestByUserID(userID: string) {
        const result = await db.query({
            text: /*sql*/ `SELECT * FROM lifted_mute WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 1;`,
            values: [userID],
            name: 'lifted-mute-latest-user-id',
        });
        if (result.rowCount === 0) return Promise.reject('The specified user does not have any lifted mutes.');
        return new LiftedMute(result.rows[0]);
    }

    static async getAllByUserID(userID: string) {
        const result = await db.query({
            text: /*sql*/ `SELECT * FROM lifted_mute WHERE user_id = $1 ORDER BY timestamp DESC;`,
            values: [userID],
            name: 'lifted-mute-all-user-id',
        });
        return result.rows.map((row) => new LiftedMute(row));
    }

    public async editReason(newReason: string, moderatorID: string) {
        if (newReason.length > 512) return Promise.reject('The mute reason must not be more than 512 characters long.');

        const oldReason = this.reason;
        const editTimestamp = new Date();

        const result = await db.query({
            text: /*sql*/ `
            	UPDATE lifted_mute
            	SET reason = $1, edited_timestamp = $2, edited_mod_id = $3
            	WHERE id = $4;`,
            values: [newReason, editTimestamp, moderatorID, this.id],
            name: 'lifted-mute-edit-reason',
        });
        if (result.rowCount === 0) return Promise.reject('Failed to edit the reason of the lifted mute.');

        this.reason = newReason;
        this.editTimestamp = editTimestamp;
        this.editModeratorID = moderatorID;

        const logString = `${parseUser(this.editModeratorID)} edited the reason of ${parseUser(this.userID)}'s lifted mute (${this.id}).\n\n**Before**\n${oldReason}\n\n**After**\n${newReason}`;

        log(logString, 'Edit Lifted Mute Reason');
        return logString;
    }

    public async delete(moderatorID: string) {
        const result = await db.query({ text: /*sql*/ `DELETE FROM lifted_mute WHERE id = $1;`, values: [this.id], name: 'lifted-mute-delete' });
        if (result.rowCount === 0) return Promise.reject('Failed to delete lifted mute.');

        const logString = `${parseUser(moderatorID)} deleted the log entry of ${parseUser(this.userID)}'s lifted mute.\n\n${this.toString(true)}`;
        log(logString, 'Delete Lifted Mute Entry');
        return logString;
    }
}
