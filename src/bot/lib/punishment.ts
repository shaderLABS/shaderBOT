import { UserResolvable } from 'discord.js';
import { db } from '../../db/postgres.js';
import { client, timeoutStore } from '../bot.js';
import { BanAppeal } from './banAppeal.js';
import { sendInfo } from './embeds.js';
import log from './log.js';
import { formatContextURL, getGuild, parseUser, userToMember } from './misc.js';
import { formatTimeDate, secondsToString } from './time.js';

const typeToString = {
    mute: 'Mute',
    kick: 'Kick',
    ban: 'Ban',
};

export class PastPunishment {
    public readonly id: string;
    public readonly userID: string;
    public readonly moderatorID?: string;
    public readonly type: 'ban' | 'mute' | 'kick';
    public readonly timestamp: Date;
    public readonly liftedTimestamp?: Date;
    public readonly liftedModeratorID?: string;

    public reason: string;
    public contextURL?: string;
    public editTimestamp?: Date;
    public editModeratorID?: string;

    constructor(data: {
        id: string;
        user_id: string;
        type: 'ban' | 'mute' | 'kick';
        mod_id?: string;
        reason: string;
        context_url?: string;
        edited_timestamp?: string | number | Date;
        edited_mod_id?: string;
        lifted_timestamp?: string | number | Date;
        lifted_mod_id?: string;
        timestamp: string | number | Date;
    }) {
        this.id = data.id;
        this.userID = data.user_id;
        this.moderatorID = data.mod_id;
        this.type = data.type;
        this.timestamp = new Date(data.timestamp);
        this.reason = data.reason;
        this.contextURL = data.context_url;
        this.editTimestamp = data.edited_timestamp ? new Date(data.edited_timestamp) : undefined;
        this.editModeratorID = data.edited_mod_id;
        this.liftedTimestamp = data.lifted_timestamp ? new Date(data.lifted_timestamp) : undefined;
        this.liftedModeratorID = data.lifted_mod_id;
    }

    static async getByUUID(uuid: string, type: 'ban' | 'mute' | 'kick') {
        const result = await db.query(/*sql*/ `SELECT * FROM past_punishment WHERE "type" = $1 AND id = $2;`, [type, uuid]);
        if (result.rowCount === 0) return Promise.reject(`A past ${type} with the specified UUID does not exist.`);
        return new PastPunishment(result.rows[0]);
    }

    static async getAnyByUUID(uuid: string) {
        const result = await db.query(/*sql*/ `SELECT * FROM past_punishment WHERE id = $1;`, [uuid]);
        if (result.rowCount === 0) return Promise.reject(`A past punishment with the specified UUID does not exist.`);
        return new PastPunishment(result.rows[0]);
    }

    static async getLatestByUserID(userID: string, type: 'ban' | 'mute' | 'kick') {
        const result = await db.query(/*sql*/ `SELECT * FROM past_punishment WHERE "type" = $1 AND user_id = $2 ORDER BY timestamp DESC LIMIT 1;`, [type, userID]);
        if (result.rowCount === 0) return Promise.reject(`The specified user does not have any past ${type}s.`);
        return new PastPunishment(result.rows[0]);
    }

    static async getAnyLatestByUserID(userID: string) {
        const result = await db.query(/*sql*/ `SELECT * FROM past_punishment WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 1;`, [userID]);
        if (result.rowCount === 0) return Promise.reject('The specified user does not have any past punishments.');
        return new PastPunishment(result.rows[0]);
    }

    static async getAllByUserID(userID: string) {
        const result = await db.query(/*sql*/ `SELECT * FROM past_punishment WHERE user_id = $1 ORDER BY timestamp DESC;`, [userID]);
        return result.rows.map((row) => new PastPunishment(row));
    }

    static async createKick(userResolvable: UserResolvable, reason: string, moderatorID?: string, contextURL?: string, deleteMessageDays?: number) {
        if (reason.length > 512) return Promise.reject('The kick reason must not be more than 512 characters long.');

        const guild = getGuild();
        if (!guild) return Promise.reject('No guild found.');

        const user = await client.users.fetch(userResolvable).catch(() => undefined);
        if (!user) return Promise.reject('Failed to resolve the user.');

        const member = await userToMember(guild, user.id);
        const timestamp = new Date();

        const result = await db.query(
            /*sql*/ `
            INSERT INTO past_punishment (user_id, "type", mod_id, reason, context_url, timestamp)
            VALUES ($1, 'kick', $2, $3, $4, $5)
            RETURNING id;`,
            [user.id, moderatorID, reason, contextURL, timestamp]
        );

        if (result.rowCount === 0) return Promise.reject('Failed to insert punishment.');
        const { id } = result.rows[0];

        const pastPunishment = new PastPunishment({
            id,
            user_id: user.id,
            mod_id: moderatorID,
            type: 'kick',
            timestamp,
            reason,
            context_url: contextURL,
        });

        let sentDM = true;
        await sendInfo(user, pastPunishment.toString(false), 'You have been kicked from shaderLABS.').catch(() => {
            sentDM = false;
        });

        if (deleteMessageDays) {
            if (await guild.bans.fetch(user).catch(() => undefined)) {
                await guild.members.unban(user, reason);
                await guild.members.ban(user, { reason, deleteMessageDays });
            } else {
                await guild.members.ban(user, { reason, deleteMessageDays });
                await guild.members.unban(user, reason);
            }
        } else {
            await member?.kick(reason);
        }

        let logString = `${parseUser(user)} has been kicked.\n\n${pastPunishment.toString()}`;
        if (!sentDM) logString += '\n\n*They did not receive a DM.*';

        log(logString, 'Kick');
        return logString;
    }

    public async editReason(newReason: string, editModeratorID: string) {
        if (newReason.length > 512) return Promise.reject(`The ${this.type} reason must not be more than 512 characters long.`);

        const oldReason = this.reason;
        const editTimestamp = new Date();

        const result = await db.query(
            /*sql*/ `
            UPDATE past_punishment
            SET reason = $1, edited_timestamp = $2, edited_mod_id = $3
            WHERE id = $4;`,
            [newReason, editTimestamp, editModeratorID, this.id]
        );
        if (result.rowCount === 0) return Promise.reject('Failed to edit the reason of the past punishment.');

        this.reason = newReason;
        this.editTimestamp = editTimestamp;
        this.editModeratorID = editModeratorID;

        const logString = `${parseUser(this.editModeratorID)} edited the reason of ${parseUser(this.userID)}'s past ${this.type} (${this.id}).\n\n**Before**\n${oldReason}\n\n**After**\n${newReason}`;

        log(logString, `Edit ${typeToString[this.type]} Reason`);
        return logString;
    }

    public async delete(moderatorID: string) {
        const result = await db.query(/*sql*/ `DELETE FROM past_punishment WHERE id = $1;`, [this.id]);
        if (result.rowCount === 0) return Promise.reject('Failed to delete past punishment.');

        const logString = `${parseUser(moderatorID)} deleted the log entry of ${parseUser(this.userID)}'s ${this.type}.\n\n${this.toString(true, true)}`;
        log(logString, 'Delete Past Punishment Entry');
        return logString;
    }

    public toString(includeUser: boolean = true, includeType: boolean = false) {
        let string = '';

        if (includeUser) {
            string += `**User:** ${parseUser(this.userID)}\n`;
        }

        if (includeType) {
            string += `**Type:** ${typeToString[this.type]}\n`;
        }

        string +=
            `**Reason:** ${this.reason}\n` +
            `**Moderator:** ${this.moderatorID ? parseUser(this.moderatorID) : 'System'}\n` +
            `**Context:** ${formatContextURL(this.contextURL)}\n` +
            `**Created At:** ${formatTimeDate(this.timestamp)}\n`;

        if (this.liftedTimestamp) {
            string += `**Lifted At:** ${formatTimeDate(this.liftedTimestamp)}\n`;
            if (this.liftedModeratorID) string += `**Lifted By:** ${parseUser(this.liftedModeratorID)}\n`;
        }

        string += `**ID:** ${this.id}`;

        if (this.editTimestamp && this.editModeratorID) {
            string += `\n*(last edited by ${parseUser(this.editModeratorID)} at ${formatTimeDate(this.editTimestamp)})*`;
        }

        return string;
    }
}

export class Punishment {
    public readonly id: string;
    public readonly userID: string;
    public readonly moderatorID?: string;
    public readonly type: 'ban' | 'mute';
    public readonly timestamp: Date;

    public reason: string;
    public contextURL?: string;
    public editTimestamp?: Date;
    public editModeratorID?: string;
    public expireTimestamp?: Date;

    constructor(data: {
        id: string;
        user_id: string;
        type: 'ban' | 'mute';
        mod_id?: string;
        reason: string;
        context_url?: string;
        edited_timestamp?: string | number | Date;
        edited_mod_id?: string;
        expire_timestamp?: string | number | Date;
        timestamp: string | number | Date;
    }) {
        this.id = data.id;
        this.userID = data.user_id;
        this.moderatorID = data.mod_id;
        this.type = data.type;
        this.timestamp = new Date(data.timestamp);
        this.reason = data.reason;
        this.contextURL = data.context_url;
        this.editTimestamp = data.edited_timestamp ? new Date(data.edited_timestamp) : undefined;
        this.editModeratorID = data.edited_mod_id;
        this.expireTimestamp = data.expire_timestamp ? new Date(data.expire_timestamp) : undefined;
    }

    static async has(userID: string, type: 'ban' | 'mute'): Promise<boolean> {
        const result = await db.query(/*sql*/ `SELECT 1 FROM punishment WHERE "type" = $1 AND user_id = $2;`, [type, userID]);
        return !!result.rows[0];
    }

    static async getByUUID(uuid: string, type: 'ban' | 'mute') {
        const result = await db.query(/*sql*/ `SELECT * FROM punishment WHERE "type" = $1 AND id = $2;`, [type, uuid]);
        if (result.rowCount === 0) return Promise.reject(`A ${type} with the specified UUID does not exist.`);
        return new Punishment(result.rows[0]);
    }

    static async getAnyByUUID(uuid: string) {
        const result = await db.query(/*sql*/ `SELECT * FROM punishment WHERE id = $1;`, [uuid]);
        if (result.rowCount === 0) return Promise.reject(`A punishment with the specified UUID does not exist.`);
        return new PastPunishment(result.rows[0]);
    }

    static async getByUserID(userID: string, type: 'ban' | 'mute') {
        const result = await db.query(/*sql*/ `SELECT * FROM punishment WHERE "type" = $1 AND user_id = $2;`, [type, userID]);
        if (result.rowCount === 0) return Promise.reject(`The specified user does not have any past ${type}s.`);
        return new Punishment(result.rows[0]);
    }

    static async getAllByUserID(userID: string) {
        const result = await db.query(/*sql*/ `SELECT * FROM punishment WHERE user_id = $1 ORDER BY timestamp DESC;`, [userID]);
        return result.rows.map((row) => new Punishment(row));
    }

    static async getExpiringToday() {
        const result = await db.query(
            /*sql*/ `
            SELECT * FROM punishment
            WHERE expire_timestamp IS NOT NULL AND expire_timestamp::DATE <= NOW()::DATE;`,
            []
        );
        return result.rows.map((row) => new Punishment(row));
    }

    static async getExpiringTomorrow() {
        const result = await db.query(
            /*sql*/ `
            SELECT * FROM punishment
            WHERE expire_timestamp IS NOT NULL AND expire_timestamp::DATE <= NOW()::DATE + INTERVAL '1 day';`,
            []
        );
        return result.rows.map((row) => new Punishment(row));
    }

    public toPastPunishment(liftedModeratorID?: string) {
        return new PastPunishment({
            id: this.id,
            reason: this.reason,
            timestamp: this.timestamp,
            type: this.type,
            user_id: this.userID,
            context_url: this.contextURL,
            edited_mod_id: this.editModeratorID,
            edited_timestamp: this.editTimestamp,
            lifted_mod_id: liftedModeratorID,
            lifted_timestamp: new Date(),
            mod_id: this.moderatorID,
        });
    }

    private async moveEntry(liftedModeratorID?: string) {
        const pastPunishment = this.toPastPunishment(liftedModeratorID);

        const result = await db.query(
            /*sql*/ `
            WITH moved_rows AS (
                DELETE FROM punishment
                WHERE id = $1
                RETURNING id, user_id, type, mod_id, reason, context_url, edited_timestamp, edited_mod_id, expire_timestamp, timestamp
            )
            INSERT INTO past_punishment (id, user_id, type, mod_id, reason, context_url, edited_timestamp, edited_mod_id, lifted_timestamp, lifted_mod_id, timestamp)
            SELECT id, user_id, type, mod_id, reason, context_url, edited_timestamp, edited_mod_id, $2::TIMESTAMP AS lifted_timestamp, $3::NUMERIC AS lifted_mod_id, timestamp FROM moved_rows;`,
            [pastPunishment.id, pastPunishment.liftedTimestamp, pastPunishment.liftedModeratorID]
        );

        if (result.rowCount === 0) return Promise.reject('Failed to move entry.');

        timeoutStore.delete(this);
        return pastPunishment;
    }

    public async move(liftedModeratorID?: string): Promise<string> {
        const guild = getGuild();
        if (!guild) return Promise.reject('No guild found.');

        const pastPunishment = await this.moveEntry(liftedModeratorID);

        if (this.type === 'ban') {
            // ban
            await guild.members.unban(this.userID).catch(() => undefined);

            let logString = `${parseUser(this.userID)} has been unbanned.`;
            if (this.expireTimestamp) logString += `\nTheir temporary ban would have expired at ${formatTimeDate(this.expireTimestamp)}.`;
            logString += '\n\n' + pastPunishment.toString();

            log(logString, 'Unban');
            return logString;
        } else {
            // mute
            const member = await userToMember(guild, this.userID);
            if (member) member.timeout(null);

            let logString = `${parseUser(this.userID)} has been unmuted.`;
            if (this.expireTimestamp) logString += `\nTheir mute would have expired at ${formatTimeDate(this.expireTimestamp)}.`;
            logString += '\n\n' + pastPunishment.toString();

            log(logString, 'Unmute');
            return logString;
        }
    }

    public async expire() {
        const guild = getGuild();
        if (!guild) return Promise.reject('No guild found.');

        try {
            await this.moveEntry();

            if (this.type === 'ban') {
                // ban
                await guild.members.unban(this.userID).catch(() => undefined);

                const appeal = await BanAppeal.getPendingByUserID(this.userID).catch(() => undefined);
                if (appeal) await appeal.expire();

                log(`${parseUser(this.userID)}'s temporary ban (${this.id}) has expired.`, 'Expire Temporary Ban');
            } else {
                // mute
                // timeout is lifted by discord

                log(`${parseUser(this.userID)}'s mute (${this.id}) has expired.`, 'Expire Mute');
            }
        } catch (error) {
            console.error(error);
            log(`An error occurred while trying to expire ${parseUser(this.userID)}'s ${this.type} (${this.id}).`, this.type === 'ban' ? 'Expire Ban' : 'Expire Mute');
        }
    }

    public async editDuration(duration: number, editModeratorID: string) {
        if (isNaN(duration)) return Promise.reject('The specified duration is not a number or exceeds the range of UNIX time.');
        if (duration < 10) return Promise.reject(`You can't ${this.type} someone for less than 10 seconds.`);
        if (this.type === 'mute' && duration > 2419200) return Promise.reject("You can't mute someone for more than 28 days.");

        const guild = getGuild();
        if (!guild) return Promise.reject('No guild found.');

        const oldExpireTimestamp = this.expireTimestamp;
        const newExpireTimestamp = new Date(this.timestamp.getTime() + duration * 1000);

        const editTimestamp = new Date();

        const result = await db.query(
            /*sql*/ `
            UPDATE punishment
            SET expire_timestamp = $1, edited_timestamp = $2, edited_mod_id = $3
            WHERE id = $4;`,
            [newExpireTimestamp, editTimestamp, editModeratorID, this.id]
        );
        if (result.rowCount === 0) return Promise.reject('Failed to edit the duration of the punishment.');

        this.expireTimestamp = newExpireTimestamp;
        this.editTimestamp = editTimestamp;
        this.editModeratorID = editModeratorID;

        const member = await userToMember(guild, this.userID).catch(() => undefined);
        if (member) member.disableCommunicationUntil(this.expireTimestamp);

        timeoutStore.delete(this);
        timeoutStore.set(this, true);

        const logString = `${parseUser(this.editModeratorID)} edited the expiry date of ${parseUser(this.userID)}'s ${this.type} (${this.id}).\n\n**Before**\n${
            oldExpireTimestamp ? formatTimeDate(oldExpireTimestamp) + ` (${secondsToString((oldExpireTimestamp.getTime() - this.timestamp.getTime()) / 1000)})` : 'Permanent'
        }\n\n**After**\n${formatTimeDate(newExpireTimestamp)} (${secondsToString((newExpireTimestamp.getTime() - this.timestamp.getTime()) / 1000)})`;

        log(logString, `Edit ${typeToString[this.type]} Duration`);
        return logString;
    }

    public async editReason(newReason: string, editModeratorID: string) {
        if (newReason.length > 512) return Promise.reject(`The ${this.type} reason must not be more than 512 characters long.`);

        const oldReason = this.reason;
        const editTimestamp = new Date();

        const result = await db.query(
            /*sql*/ `
            UPDATE punishment
            SET reason = $1, edited_timestamp = $2, edited_mod_id = $3
            WHERE id = $4;`,
            [newReason, editTimestamp, editModeratorID, this.id]
        );
        if (result.rowCount === 0) return Promise.reject('Failed to edit the reason of the punishment.');

        this.reason = newReason;
        this.editTimestamp = editTimestamp;
        this.editModeratorID = editModeratorID;

        const logString = `${parseUser(this.editModeratorID)} edited the reason of ${parseUser(this.userID)}'s current ${this.type} (${
            this.id
        }).\n\n**Before**\n${oldReason}\n\n**After**\n${newReason}`;

        log(logString, `Edit ${typeToString[this.type]} Reason`);
        return logString;
    }

    private static async createEntry(userID: string, type: 'ban' | 'mute', reason: string, moderatorID?: string, contextURL?: string, duration?: number) {
        const overwrittenPunishment = await Punishment.getByUserID(userID, type).catch(() => undefined);
        await overwrittenPunishment?.moveEntry(moderatorID);

        const timestamp = new Date();
        const expireTimestamp = duration ? new Date(timestamp.getTime() + duration * 1000) : undefined;

        const result = await db.query(
            /*sql*/ `
            INSERT INTO punishment (user_id, "type", mod_id, reason, context_url, expire_timestamp, timestamp)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id;`,
            [userID, type, moderatorID, reason, contextURL, expireTimestamp, timestamp]
        );

        if (result.rowCount === 0) return Promise.reject('Failed to insert punishment.');
        const { id } = result.rows[0];

        const punishment = new Punishment({
            id,
            reason,
            timestamp,
            type,
            user_id: userID,
            context_url: contextURL,
            mod_id: moderatorID,
            expire_timestamp: expireTimestamp,
        });

        return {
            punishment,
            overwrittenPunishment,
        };
    }

    public static async createBan(userResolvable: UserResolvable, reason: string, duration?: number, moderatorID?: string, contextURL?: string, deleteMessageDays?: number) {
        if (duration) {
            if (isNaN(duration)) return Promise.reject('The specified duration is not a number or exceeds the range of UNIX time.');
            if (duration < 10) return Promise.reject("You can't ban someone for less than 10 seconds.");
        }

        if (reason.length > 512) return Promise.reject('The ban reason must not be more than 512 characters long.');

        const guild = getGuild();
        if (!guild) return Promise.reject('No guild found.');

        const user = await client.users.fetch(userResolvable).catch(() => undefined);
        if (!user) return Promise.reject('Failed to resolve the user.');

        const { punishment, overwrittenPunishment } = await Punishment.createEntry(user.id, 'ban', reason, moderatorID, contextURL, duration);

        let sentDM = true;
        await sendInfo(user, punishment.toString(false), 'You have been banned from shaderLABS.').catch(() => {
            sentDM = false;
        });

        if (await guild.bans.fetch(user).catch(() => undefined)) {
            // is banned
            if (deleteMessageDays) {
                await guild.members.unban(user, 'Rebanning an already banned user in order to delete their messages.');
                await guild.members.ban(user, { reason, deleteMessageDays });
            }
        } else {
            // is not banned
            await guild.members.ban(user, { reason, deleteMessageDays });
        }

        if (duration) timeoutStore.set(punishment, true);

        let logString = `${parseUser(user)} has been ${duration ? `temporarily banned for ${secondsToString(duration)}.` : 'permanently banned.'}\n\n${punishment.toString()}`;
        if (overwrittenPunishment) logString += '\n\nTheir previous ban has been overwritten:\n' + overwrittenPunishment.toString();
        if (!sentDM) logString += '\n\n*They did not receive a DM.*';

        log(logString, duration ? 'Temporary Ban' : 'Permanent Ban');
        return logString;
    }

    public static async createMute(userResolvable: UserResolvable, reason: string, duration: number, moderatorID?: string, contextURL?: string) {
        if (isNaN(duration)) return Promise.reject('The specified duration is not a number or exceeds the range of UNIX time.');
        if (duration < 10) return Promise.reject("You can't mute someone for less than 10 seconds.");
        if (duration > 2419200) return Promise.reject("You can't mute someone for more than 28 days.");

        if (reason.length > 512) return Promise.reject('The mute reason must not be more than 512 characters long.');

        const guild = getGuild();
        if (!guild) return Promise.reject('No guild found.');

        const user = await client.users.fetch(userResolvable).catch(() => undefined);
        if (!user) return Promise.reject('Failed to resolve the user.');

        const member = await userToMember(guild, user.id);

        const { punishment, overwrittenPunishment } = await Punishment.createEntry(user.id, 'mute', reason, moderatorID, contextURL, duration);

        let sentDM = true;
        await sendInfo(user, punishment.toString(false), 'You have been muted on shaderLABS.').catch(() => {
            sentDM = false;
        });

        if (member) member.timeout(duration * 1000, reason);
        timeoutStore.set(punishment, true);

        let logString = `${parseUser(user)} has been muted for ${secondsToString(duration)}.\n\n${punishment.toString()}`;
        if (overwrittenPunishment) logString += `\n\nTheir previous mute has been overwritten:\n` + overwrittenPunishment.toString();
        if (!sentDM) logString += '\n\n*They did not receive a DM.*';

        log(logString, 'Mute');
        return logString;
    }

    public toString(includeUser: boolean = true, includeType: boolean = false) {
        let string = '';

        if (includeUser) {
            string += `**User:** ${parseUser(this.userID)}\n`;
        }

        if (includeType) {
            string += `**Type:** ${typeToString[this.type]}\n`;
        }

        string +=
            `**Reason:** ${this.reason}\n` +
            `**Moderator:** ${this.moderatorID ? parseUser(this.moderatorID) : 'System'}\n` +
            `**Context:** ${formatContextURL(this.contextURL)}\n` +
            `**Created At:** ${formatTimeDate(this.timestamp)}\n` +
            `**Expiring At:** ${this.expireTimestamp ? formatTimeDate(this.expireTimestamp) : 'Permanent'}\n` +
            `**ID:** ${this.id}`;

        if (this.editTimestamp && this.editModeratorID) {
            string += `\n*(last edited by ${parseUser(this.editModeratorID)} at ${formatTimeDate(this.editTimestamp)})*`;
        }

        return string;
    }
}
