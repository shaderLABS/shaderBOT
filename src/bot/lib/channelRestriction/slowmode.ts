import { AnyThreadChannel, ChannelType, TextChannel } from 'discord.js';
import { db } from '../../../db/postgres.js';
import { client, timeoutStore } from '../../bot.js';
import log from '../log.js';
import { parseUser } from '../misc.js';
import { formatTimeDate, secondsToString } from '../time.js';
import { ChannelRestriction } from './main.js';

export class ChannelSlowmode extends ChannelRestriction {
    public static readonly CHANNEL_TYPES = [ChannelType.GuildText, ChannelType.PublicThread, ChannelType.PrivateThread] as const;

    public readonly originalSlowmode: number;

    constructor(data: { id: string; channel_id: string; previous_state: number; expire_timestamp: string | number | Date }) {
        super(data);
        this.originalSlowmode = data.previous_state;
    }

    static async getByUUID(uuid: string) {
        const result = await db.query({ text: /*sql*/ `SELECT * FROM lock_slowmode WHERE "type" = 'slowmode' AND id = $1;`, values: [uuid], name: 'slowmode-uuid' });
        if (result.rowCount === 0) return Promise.reject('A channel slowmode with the specified UUID does not exist.');
        return new ChannelSlowmode(result.rows[0]);
    }

    static async getByChannelID(channelID: string) {
        const result = await db.query({ text: /*sql*/ `SELECT * FROM lock_slowmode WHERE "type" = 'slowmode' AND channel_id = $1;`, values: [channelID], name: 'slowmode-channel-id' });
        if (result.rowCount === 0) return Promise.reject(`The specified channel does not have an active channel slowmode.`);
        return new ChannelSlowmode(result.rows[0]);
    }

    static async getExpiringToday() {
        const result = await db.query({
            text: /*sql*/ `
                SELECT * FROM lock_slowmode
                WHERE "type" = 'slowmode' AND expire_timestamp IS NOT NULL AND expire_timestamp::DATE <= NOW()::DATE;`,
            name: 'slowmode-expiring-today',
        });

        return result.rows.map((row) => new ChannelSlowmode(row));
    }

    static async getExpiringTomorrow() {
        const result = await db.query({
            text: /*sql*/ `
                SELECT * FROM lock_slowmode
                WHERE "type" = 'slowmode' AND expire_timestamp IS NOT NULL AND expire_timestamp::DATE <= NOW()::DATE + INTERVAL '1 day';`,
            name: 'slowmode-expiring-tomorrow',
        });

        return result.rows.map((row) => new ChannelSlowmode(row));
    }

    public static async create(moderatorID: string, channel: TextChannel | AnyThreadChannel, duration: number, length: number): Promise<string> {
        if (isNaN(duration)) return Promise.reject('The specified duration is not a number or exceeds the range of UNIX time.');
        if (duration < 10) return Promise.reject("You can't slow a channel for less than 10 seconds.");

        if (isNaN(length)) return Promise.reject('The specified slowmode length is not a number or exceeds the range of UNIX time.');
        if (length < 0) return Promise.reject('The slowmode length can not be negative.');
        if (length > 21600) return Promise.reject('The maximum slowmode length is 6h (21600s).');

        let originalSlowmode = channel.rateLimitPerUser || 0;
        const expireTimestamp = new Date(Date.now() + duration * 1000);

        const overwrittenSlowmode = await ChannelSlowmode.getByChannelID(channel.id).catch(() => undefined);
        if (overwrittenSlowmode) {
            originalSlowmode = overwrittenSlowmode.originalSlowmode;
            timeoutStore.delete(overwrittenSlowmode);
            await overwrittenSlowmode.delete();
        }

        const result = await db.query({
            text: /*sql*/ `
                INSERT INTO lock_slowmode ("type", channel_id, previous_state, expire_timestamp)
                VALUES ('slowmode', $1, $2, $3)
                RETURNING id;`,
            values: [channel.id, originalSlowmode, expireTimestamp],
            name: 'create-slowmode',
        });

        if (result.rowCount === 0) return Promise.reject('Failed to insert channel slowmode.');
        const { id } = result.rows[0];

        const slowmode = new ChannelSlowmode({
            id,
            channel_id: channel.id,
            previous_state: originalSlowmode,
            expire_timestamp: expireTimestamp,
        });

        await channel.setRateLimitPerUser(length);
        timeoutStore.set(slowmode, true);

        let logString = `${parseUser(moderatorID)} has slowed ${channel.toString()} to ${length}s for ${secondsToString(duration)}.`;
        if (overwrittenSlowmode) logString += `\nThe existing slowmode has been overwritten.`;

        log(logString, 'Create Slowmode');
        return logString;
    }

    async refresh() {
        return ChannelSlowmode.getByUUID(this.id);
    }

    async expire() {
        const channel = client.channels.cache.get(this.channelID);

        try {
            if (!channel || (channel.type !== ChannelType.GuildText && !channel.isThread())) {
                log(`Failed to expire slowmode. The channel <#${this.channelID}> could not be resolved.`, 'Expire Slowmode');
                return;
            }

            await channel.setRateLimitPerUser(this.originalSlowmode);
            await this.delete();

            log(`The channel slowmode in <#${this.channelID}> has expired.`, 'Expire Slowmode');
        } catch (error) {
            console.error(error);
            log(`An error occurred while trying to expire ${this.channelID}'s channel slowmode.`, 'Expire Slowmode');
        }
    }

    public async lift(moderatorID: string): Promise<string> {
        const channel = client.channels.cache.get(this.channelID);

        if (!channel || (channel.type !== ChannelType.GuildText && !channel.isThread())) {
            return Promise.reject(`The channel <#${this.channelID}> could not be resolved.`);
        }

        await channel.setRateLimitPerUser(this.originalSlowmode);
        await this.delete();

        timeoutStore.delete(this);

        let logString = `${parseUser(moderatorID)} has lifted the channel slowmode in <#${this.channelID}>. \nIt would have expired at ${formatTimeDate(this.expireTimestamp)}.`;
        log(logString, 'Lift Slowmode');
        return logString;
    }

    async delete() {
        const result = await db.query({ text: /*sql*/ `DELETE FROM lock_slowmode WHERE id = $1 RETURNING id;`, values: [this.id], name: 'slowmode-delete' });
        if (result.rowCount === 0) return Promise.reject(`Failed to delete channel slowmode.`);
    }
}
