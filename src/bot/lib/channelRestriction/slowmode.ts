import { type AnyThreadChannel, ChannelType, TextChannel } from 'discord.js';
import * as sql from 'drizzle-orm/sql';
import { db } from '../../../db/postgres.ts';
import * as schema from '../../../db/schema.ts';
import { client, timeoutStore } from '../../bot.ts';
import log from '../log.ts';
import { parseUser } from '../misc.ts';
import { formatTimeDate, secondsToString } from '../time.ts';
import { ChannelRestriction } from './main.ts';

export class ChannelSlowmode extends ChannelRestriction {
    public static readonly CHANNEL_TYPES = [ChannelType.GuildText, ChannelType.PublicThread, ChannelType.PrivateThread] as const;

    public readonly originalSlowmode: number;

    constructor(data: typeof schema.channelSlowmode.$inferSelect) {
        super(data);
        this.originalSlowmode = data.originalSlowmode;
    }

    static async getByUUID(uuid: string) {
        const result = await db.query.channelSlowmode.findFirst({ where: sql.eq(schema.channelSlowmode.id, uuid) });
        if (!result) return Promise.reject('A channel slowmode with the specified UUID does not exist.');
        return new ChannelSlowmode(result);
    }

    static async getByChannelID(channelId: string) {
        const result = await db.query.channelSlowmode.findFirst({ where: sql.eq(schema.channelSlowmode.channelId, channelId) });
        if (!result) return Promise.reject(`The specified channel does not have an active channel slowmode.`);
        return new ChannelSlowmode(result);
    }

    static async getExpiringToday() {
        const result = await db.query.channelSlowmode.findMany({
            where: sql.lte(sql.sql`${schema.channelSlowmode.expireTimestamp}::DATE`, sql.sql`NOW()::DATE`),
        });

        return result.map((entry) => new ChannelSlowmode(entry));
    }

    static async getExpiringTomorrow() {
        const result = await db.query.channelSlowmode.findMany({
            where: sql.lte(sql.sql`${schema.channelSlowmode.expireTimestamp}::DATE`, sql.sql`NOW()::DATE + INTERVAL '1 day'`),
        });

        return result.map((entry) => new ChannelSlowmode(entry));
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

        const data = {
            channelId: channel.id,
            originalSlowmode,
            expireTimestamp,
        } satisfies typeof schema.channelSlowmode.$inferInsert;

        const result = await db.insert(schema.channelSlowmode).values(data).returning({ id: schema.channelSlowmode.id });

        if (result.length === 0) return Promise.reject('Failed to insert channel slowmode.');
        const { id } = result[0];

        const slowmode = new ChannelSlowmode({ id, ...data });

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
        const channel = client.channels.cache.get(this.channelId);

        try {
            if (!channel || (channel.type !== ChannelType.GuildText && !channel.isThread())) {
                log(`Failed to expire slowmode. The channel <#${this.channelId}> could not be resolved.`, 'Expire Slowmode');
                return;
            }

            await channel.setRateLimitPerUser(this.originalSlowmode);
            await this.delete();

            log(`The channel slowmode in <#${this.channelId}> has expired.`, 'Expire Slowmode');
        } catch (error) {
            console.error(error);
            log(`An error occurred while trying to expire ${this.channelId}'s channel slowmode.`, 'Expire Slowmode');
        }
    }

    public async lift(moderatorID: string): Promise<string> {
        const channel = client.channels.cache.get(this.channelId);

        if (!channel || (channel.type !== ChannelType.GuildText && !channel.isThread())) {
            return Promise.reject(`The channel <#${this.channelId}> could not be resolved.`);
        }

        await channel.setRateLimitPerUser(this.originalSlowmode);
        await this.delete();

        timeoutStore.delete(this);

        let logString = `${parseUser(moderatorID)} has lifted the channel slowmode in <#${this.channelId}>. \nIt would have expired at ${formatTimeDate(this.expireTimestamp)}.`;
        log(logString, 'Lift Slowmode');
        return logString;
    }

    async delete() {
        const result = await db.delete(schema.channelSlowmode).where(sql.eq(schema.channelSlowmode.id, this.id));
        if (result.rowCount === 0) return Promise.reject('Failed to delete channel slowmode.');
    }
}
