import { BitField, PermissionFlagsBits, PermissionOverwriteOptions, TextChannel, ThreadChannel, VoiceChannel } from 'discord.js';
import { db } from '../../db/postgres.js';
import { timeoutStore } from '../bot.js';
import log from './log.js';
import { getGuild, parseUser } from './misc.js';
import { formatTimeDate, secondsToString } from './time.js';

const enum LockPermissionFlagBits {
    AllowSendMessages = 1 << 0,
    DenySendMessages = 1 << 1,

    // Text Channel
    AllowCreatePublicThreads = 1 << 2,
    DenyCreatePublicThreads = 1 << 3,

    AllowCreatePrivateThreads = 1 << 4,
    DenyCreatePrivateThreads = 1 << 5,

    // Voice Channel
    AllowSpeak = 1 << 2,
    DenySpeak = 1 << 3,
}

export class LockSlowmode {
    public readonly id: string;
    public readonly type: 'lock' | 'slowmode';
    public readonly channelID: string;
    public readonly previousState: number; // permission bitfield or slow mode length
    public readonly expireTimestamp: Date;

    constructor(data: { id: string; type: 'lock' | 'slowmode'; channel_id: string; previous_state: number; expire_timestamp: string | number | Date }) {
        this.id = data.id;
        this.type = data.type;
        this.channelID = data.channel_id;
        this.expireTimestamp = new Date(data.expire_timestamp);
        this.previousState = data.previous_state;
    }

    static async getByUUID(uuid: string, type: 'lock' | 'slowmode') {
        const result = await db.query(/*sql*/ `SELECT * FROM lock_slowmode WHERE "type" = $1 AND id = $2;`, [type, uuid]);
        if (result.rowCount === 0) return Promise.reject(`A ${type} with the specified UUID does not exist.`);
        return new LockSlowmode(result.rows[0]);
    }

    static async getAnyByUUID(uuid: string) {
        const result = await db.query(/*sql*/ `SELECT * FROM lock_slowmode WHERE id = $1;`, [uuid]);
        if (result.rowCount === 0) return Promise.reject(`A lock/slowmode with the specified UUID does not exist.`);
        return new LockSlowmode(result.rows[0]);
    }

    static async getByChannelID(channelID: string, type: 'lock' | 'slowmode') {
        const result = await db.query(/*sql*/ `SELECT * FROM lock_slowmode WHERE "type" = $1 AND channel_id = $2;`, [type, channelID]);
        if (result.rowCount === 0) return Promise.reject(`The specified channel does not have an active ${type}.`);
        return new LockSlowmode(result.rows[0]);
    }

    static async getAllByChannelID(channelID: string) {
        const result = await db.query(/*sql*/ `SELECT * FROM lock_slowmode WHERE channel_id = $1 ORDER BY timestamp DESC;`, [channelID]);
        return result.rows.map((row) => new LockSlowmode(row));
    }

    static async getExpiringToday() {
        const result = await db.query(
            /*sql*/ `
            SELECT * FROM lock_slowmode
            WHERE expire_timestamp IS NOT NULL AND expire_timestamp::DATE <= NOW()::DATE;`,
            []
        );
        return result.rows.map((row) => new LockSlowmode(row));
    }

    static async getExpiringTomorrow() {
        const result = await db.query(
            /*sql*/ `
            SELECT * FROM lock_slowmode
            WHERE expire_timestamp IS NOT NULL AND expire_timestamp::DATE <= NOW()::DATE + INTERVAL '1 day';`,
            []
        );
        return result.rows.map((row) => new LockSlowmode(row));
    }

    public static getLockState(channel: TextChannel | VoiceChannel) {
        const overwrite = channel.permissionOverwrites.cache.get(channel.guild.roles.everyone.id);
        if (!overwrite) return 0;

        const state = new BitField();

        if (overwrite.allow.has(PermissionFlagsBits.SendMessages)) state.add(LockPermissionFlagBits.AllowSendMessages);
        if (overwrite.deny.has(PermissionFlagsBits.SendMessages)) state.add(LockPermissionFlagBits.DenySendMessages);

        if (channel.isText()) {
            if (overwrite.allow.has(PermissionFlagsBits.CreatePublicThreads)) state.add(LockPermissionFlagBits.AllowCreatePublicThreads);
            if (overwrite.deny.has(PermissionFlagsBits.CreatePublicThreads)) state.add(LockPermissionFlagBits.DenyCreatePublicThreads);
            if (overwrite.allow.has(PermissionFlagsBits.CreatePrivateThreads)) state.add(LockPermissionFlagBits.AllowCreatePrivateThreads);
            if (overwrite.deny.has(PermissionFlagsBits.CreatePrivateThreads)) state.add(LockPermissionFlagBits.DenyCreatePrivateThreads);
        } else if (channel.isVoice()) {
            if (overwrite.allow.has(PermissionFlagsBits.Speak)) state.add(LockPermissionFlagBits.AllowSpeak);
            if (overwrite.deny.has(PermissionFlagsBits.Speak)) state.add(LockPermissionFlagBits.DenySpeak);
        }

        return state.bitfield;
    }

    public static applyLockState(state: number, channel: TextChannel | VoiceChannel) {
        const bitfield = new BitField(state);
        const overwrite: PermissionOverwriteOptions = { SendMessages: null };

        if (bitfield.has(LockPermissionFlagBits.AllowSendMessages)) overwrite.SendMessages = true;
        if (bitfield.has(LockPermissionFlagBits.DenySendMessages)) overwrite.SendMessages = false;

        if (channel.isText()) {
            overwrite.CreatePublicThreads = null;
            if (bitfield.has(LockPermissionFlagBits.AllowCreatePublicThreads)) overwrite.CreatePublicThreads = true;
            if (bitfield.has(LockPermissionFlagBits.DenyCreatePublicThreads)) overwrite.CreatePublicThreads = false;

            overwrite.CreatePrivateThreads = null;
            if (bitfield.has(LockPermissionFlagBits.AllowCreatePrivateThreads)) overwrite.CreatePrivateThreads = true;
            if (bitfield.has(LockPermissionFlagBits.DenyCreatePrivateThreads)) overwrite.CreatePrivateThreads = false;
        } else if (channel.isVoice()) {
            overwrite.Speak = null;
            if (bitfield.has(LockPermissionFlagBits.AllowSpeak)) overwrite.Speak = true;
            if (bitfield.has(LockPermissionFlagBits.DenySpeak)) overwrite.Speak = false;
        }

        return channel.permissionOverwrites.edit(channel.guild.roles.everyone.id, overwrite);
    }

    public static async createLock(moderatorID: string, channel: TextChannel | VoiceChannel, duration: number): Promise<string> {
        if (isNaN(duration)) return Promise.reject('The specified duration is not a number or exceeds the range of UNIX time.');
        if (duration < 10) return Promise.reject("You can't lock a channel for less than 10 seconds.");

        let previousState = LockSlowmode.getLockState(channel);
        const expireTimestamp = new Date(Date.now() + duration * 1000);

        const overwrittenLock = await LockSlowmode.getByChannelID(channel.id, 'lock').catch(() => undefined);
        if (overwrittenLock) {
            previousState = overwrittenLock.previousState;
            timeoutStore.delete(overwrittenLock);
            await overwrittenLock.delete();
        }

        const result = await db.query(
            /*sql*/ `
            INSERT INTO lock_slowmode ("type", channel_id, previous_state, expire_timestamp)
            VALUES ('lock', $1, $2, $3)
            RETURNING id;`,
            [channel.id, previousState, expireTimestamp]
        );

        if (result.rowCount === 0) return Promise.reject('Failed to insert channel lock.');
        const { id } = result.rows[0];

        const lock = new LockSlowmode({
            id,
            type: 'lock',
            channel_id: channel.id,
            previous_state: previousState,
            expire_timestamp: expireTimestamp,
        });

        await channel.permissionOverwrites.edit(channel.guild.roles.everyone, { SendMessages: false, CreatePublicThreads: false, CreatePrivateThreads: false, Speak: false });
        timeoutStore.set(lock, true);

        let logString = `${parseUser(moderatorID)} has locked ${channel.toString()} for ${secondsToString(duration)}.`;
        if (overwrittenLock) logString += `\nThe existing lock has been overwritten.`;

        log(logString, 'Create Lock');
        return logString;
    }

    public static async createSlowmode(moderatorID: string, channel: TextChannel | ThreadChannel, duration: number, length: number): Promise<string> {
        if (isNaN(duration)) return Promise.reject('The specified duration is not a number or exceeds the range of UNIX time.');
        if (duration < 10) return Promise.reject("You can't slow a channel for less than 10 seconds.");

        if (isNaN(length)) return Promise.reject('The specified slowmode length is not a number or exceeds the range of UNIX time.');
        if (length < 0) return Promise.reject('The slowmode length can not be negative.');
        if (length > 21600) return Promise.reject('The maximum slowmode length is 6h (21600s).');

        let previousState = channel.rateLimitPerUser || 0;
        const expireTimestamp = new Date(Date.now() + duration * 1000);

        const overwrittenSlowmode = await LockSlowmode.getByChannelID(channel.id, 'slowmode').catch(() => undefined);
        if (overwrittenSlowmode) {
            previousState = overwrittenSlowmode.previousState;
            timeoutStore.delete(overwrittenSlowmode);
            await overwrittenSlowmode.delete();
        }

        const result = await db.query(
            /*sql*/ `
            INSERT INTO lock_slowmode ("type", channel_id, previous_state, expire_timestamp)
            VALUES ('slowmode', $1, $2, $3)
            RETURNING id;`,
            [channel.id, previousState, expireTimestamp]
        );

        if (result.rowCount === 0) return Promise.reject('Failed to insert channel slowmode.');
        const { id } = result.rows[0];

        const slowmode = new LockSlowmode({
            id,
            type: 'slowmode',
            channel_id: channel.id,
            previous_state: previousState,
            expire_timestamp: expireTimestamp,
        });

        await channel.setRateLimitPerUser(length);
        timeoutStore.set(slowmode, true);

        let logString = `${parseUser(moderatorID)} has slowed ${channel.toString()} to ${length}s for ${secondsToString(duration)}.`;
        if (overwrittenSlowmode) logString += `\nThe existing slowmode has been overwritten.`;

        log(logString, 'Create Slowmode');
        return logString;
    }

    public async expire() {
        const channel = getGuild()?.channels.cache.get(this.channelID);

        try {
            if (this.type === 'lock') {
                if (!channel || (!channel.isText() && !channel.isVoice())) return log(`Failed to expire lock. The channel <#${this.channelID}> could not be resolved.`, 'Expire Lock');
                await LockSlowmode.applyLockState(this.previousState, channel);
            } else {
                if (!channel || (!channel.isText() && !channel.isThread())) {
                    return log(`Failed to expire slowmode. The channel <#${this.channelID}> could not be resolved.`, 'Expire Slowmode');
                }
                await channel.setRateLimitPerUser(this.previousState);
            }

            await this.delete();

            log(`The ${this.type} in <#${this.channelID}> has expired.`, this.type === 'lock' ? 'Expire Lock' : 'Expire Slowmode');
        } catch (error) {
            console.error(error);
            log(`An error occurred while trying to expire ${this.channelID}'s ${this.type}.`, this.type === 'lock' ? 'Expire Lock' : 'Expire Slowmode');
        }
    }

    public async lift(moderatorID: string): Promise<string> {
        const channel = getGuild()?.channels.cache.get(this.channelID);

        if (this.type === 'lock') {
            if (!channel || (!channel.isText() && !channel.isVoice())) return Promise.reject(`The channel <#${this.channelID}> could not be resolved.`);
            await LockSlowmode.applyLockState(this.previousState, channel);
        } else {
            if (!channel || (!channel.isText() && !channel.isThread())) {
                return Promise.reject(`The channel <#${this.channelID}> could not be resolved.`);
            }
            await channel.setRateLimitPerUser(this.previousState);
        }

        await this.delete();
        timeoutStore.delete(this);

        let logString = `${parseUser(moderatorID)} has lifted the ${this.type} in <#${this.channelID}>. \nIt would have expired at ${formatTimeDate(this.expireTimestamp)}.`;
        log(logString, this.type === 'lock' ? 'Lift Lock' : 'Lift Slowmode');
        return logString;
    }

    private async delete() {
        const result = await db.query(/*sql*/ `DELETE FROM lock_slowmode WHERE id = $1 RETURNING id;`, [this.id]);
        if (result.rowCount === 0) return Promise.reject(`Failed to delete channel ${this.type}.`);
    }
}
