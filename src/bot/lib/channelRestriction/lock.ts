import { BitField, ChannelType, OverwriteType, PermissionFlagsBits, type PermissionOverwriteOptions, TextChannel, VoiceChannel } from 'discord.js';
import * as sql from 'drizzle-orm/sql';
import { db } from '../../../db/postgres.ts';
import * as schema from '../../../db/schema.ts';
import { client, timeoutStore } from '../../bot.ts';
import log from '../log.ts';
import { parseUser } from '../misc.ts';
import { formatTimeDate, secondsToString } from '../time.ts';
import { ChannelRestriction } from './main.ts';

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

class ChannelLockPermissions {
    private permissions: BitField<string, number>;

    constructor(permissions?: number) {
        this.permissions = new BitField(permissions);
    }

    get sendMessages() {
        return this.permissions.has(LockPermissionFlagBits.AllowSendMessages) ? true : this.permissions.has(LockPermissionFlagBits.DenySendMessages) ? false : null;
    }

    private set sendMessages(value: boolean | null) {
        this.permissions.remove(LockPermissionFlagBits.AllowSendMessages, LockPermissionFlagBits.DenySendMessages);

        if (value === true) this.permissions.add(LockPermissionFlagBits.AllowSendMessages);
        if (value === false) this.permissions.add(LockPermissionFlagBits.DenySendMessages);
    }

    get createPublicThreads() {
        return this.permissions.has(LockPermissionFlagBits.AllowCreatePublicThreads) ? true : this.permissions.has(LockPermissionFlagBits.DenyCreatePublicThreads) ? false : null;
    }

    private set createPublicThreads(value: boolean | null) {
        this.permissions.remove(LockPermissionFlagBits.AllowCreatePublicThreads, LockPermissionFlagBits.DenyCreatePublicThreads);

        if (value === true) this.permissions.add(LockPermissionFlagBits.AllowCreatePublicThreads);
        if (value === false) this.permissions.add(LockPermissionFlagBits.DenyCreatePublicThreads);
    }

    get createPrivateThreads() {
        return this.permissions.has(LockPermissionFlagBits.AllowCreatePrivateThreads) ? true : this.permissions.has(LockPermissionFlagBits.DenyCreatePrivateThreads) ? false : null;
    }

    private set createPrivateThreads(value: boolean | null) {
        this.permissions.remove(LockPermissionFlagBits.AllowCreatePrivateThreads, LockPermissionFlagBits.DenyCreatePrivateThreads);

        if (value === true) this.permissions.add(LockPermissionFlagBits.AllowCreatePrivateThreads);
        if (value === false) this.permissions.add(LockPermissionFlagBits.DenyCreatePrivateThreads);
    }

    get speak() {
        return this.permissions.has(LockPermissionFlagBits.AllowSpeak) ? true : this.permissions.has(LockPermissionFlagBits.DenySpeak) ? false : null;
    }

    private set speak(value: boolean | null) {
        this.permissions.remove(LockPermissionFlagBits.AllowSpeak, LockPermissionFlagBits.DenySpeak);

        if (value === true) this.permissions.add(LockPermissionFlagBits.AllowSpeak);
        if (value === false) this.permissions.add(LockPermissionFlagBits.DenySpeak);
    }

    static fromChannel(channel: TextChannel | VoiceChannel) {
        const state = new ChannelLockPermissions();

        const overwrite = channel.permissionOverwrites.cache.get(channel.guild.roles.everyone.id);
        if (!overwrite) return state;

        state.sendMessages = overwrite.allow.has(PermissionFlagsBits.SendMessages) ? true : overwrite.deny.has(PermissionFlagsBits.SendMessages) ? false : null;

        if (channel.type === ChannelType.GuildText) {
            state.createPublicThreads = overwrite.allow.has(PermissionFlagsBits.CreatePublicThreads) ? true : overwrite.deny.has(PermissionFlagsBits.CreatePublicThreads) ? false : null;
            state.createPrivateThreads = overwrite.allow.has(PermissionFlagsBits.CreatePrivateThreads) ? true : overwrite.deny.has(PermissionFlagsBits.CreatePrivateThreads) ? false : null;
        } else if (channel.type === ChannelType.GuildVoice) {
            state.speak = overwrite.allow.has(PermissionFlagsBits.Speak) ? true : overwrite.deny.has(PermissionFlagsBits.Speak) ? false : null;
        }

        return state;
    }

    apply(channel: TextChannel | VoiceChannel) {
        const overwrite: PermissionOverwriteOptions = {
            SendMessages: this.sendMessages,
        };

        if (channel.type === ChannelType.GuildText) {
            overwrite.CreatePublicThreads = this.createPublicThreads;
            overwrite.CreatePrivateThreads = this.createPrivateThreads;
        } else {
            overwrite.Speak = this.speak;
        }

        return channel.permissionOverwrites.edit(channel.guild.roles.everyone, overwrite, { type: OverwriteType.Role });
    }

    toPostgres() {
        return this.permissions.bitfield;
    }
}

export class ChannelLock extends ChannelRestriction {
    public static readonly CHANNEL_TYPES = [ChannelType.GuildText, ChannelType.GuildVoice] as const;

    public readonly originalPermissions: ChannelLockPermissions;

    constructor(data: typeof schema.channelLock.$inferSelect) {
        super(data);
        this.originalPermissions = new ChannelLockPermissions(data.originalPermissions);
    }

    static async getByUUID(uuid: string) {
        const result = await db.query.channelLock.findFirst({ where: sql.eq(schema.channelLock.id, uuid) });
        if (!result) return Promise.reject('A channel lock with the specified UUID does not exist.');
        return new ChannelLock(result);
    }

    static async getByChannelID(channelId: string) {
        const result = await db.query.channelLock.findFirst({ where: sql.eq(schema.channelLock.channelId, channelId) });
        if (!result) return Promise.reject('The specified channel does not have an active channel lock.');
        return new ChannelLock(result);
    }

    static async getExpiringToday() {
        const result = await db.query.channelLock.findMany({
            where: sql.lte(sql.sql`${schema.channelLock.expireTimestamp}::DATE`, sql.sql`NOW()::DATE`),
        });

        return result.map((entry) => new ChannelLock(entry));
    }

    static async getExpiringTomorrow() {
        const result = await db.query.channelLock.findMany({
            where: sql.lte(sql.sql`${schema.channelLock.expireTimestamp}::DATE`, sql.sql`NOW()::DATE + INTERVAL '1 day'`),
        });

        return result.map((entry) => new ChannelLock(entry));
    }

    public static async create(moderatorID: string, channel: TextChannel | VoiceChannel, duration: number): Promise<string> {
        if (isNaN(duration)) return Promise.reject('The specified duration is not a number or exceeds the range of UNIX time.');
        if (duration < 10) return Promise.reject("You can't lock a channel for less than 10 seconds.");

        let originalPermissions = ChannelLockPermissions.fromChannel(channel);
        const expireTimestamp = new Date(Date.now() + duration * 1000);

        const overwrittenLock = await ChannelLock.getByChannelID(channel.id).catch(() => undefined);
        if (overwrittenLock) {
            originalPermissions = overwrittenLock.originalPermissions;
            timeoutStore.delete(overwrittenLock);
            await overwrittenLock.delete();
        }

        const data = {
            channelId: channel.id,
            originalPermissions: originalPermissions.toPostgres(),
            expireTimestamp,
        } satisfies typeof schema.channelLock.$inferInsert;

        const result = await db.insert(schema.channelLock).values(data).returning({ id: schema.channelLock.id });

        if (result.length === 0) return Promise.reject('Failed to insert channel lock.');
        const { id } = result[0];

        const lock = new ChannelLock({ id, ...data });

        await channel.permissionOverwrites.edit(
            channel.guild.roles.everyone,
            { SendMessages: false, CreatePublicThreads: false, CreatePrivateThreads: false, Speak: false },
            { type: OverwriteType.Role },
        );

        timeoutStore.set(lock, true);

        let logString = `${parseUser(moderatorID)} has locked ${channel.toString()} for ${secondsToString(duration)}.`;
        if (overwrittenLock) logString += `\nThe existing lock has been overwritten.`;

        log(logString, 'Create Lock');
        return logString;
    }

    async refresh() {
        return ChannelLock.getByUUID(this.id);
    }

    async expire() {
        const channel = client.channels.cache.get(this.channelId);

        try {
            if (!channel || (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildVoice)) {
                log(`Failed to expire lock. The channel <#${this.channelId}> could not be resolved.`, 'Expire Lock');
                return;
            }

            await this.originalPermissions.apply(channel);
            await this.delete();

            log(`The channel lock in <#${this.channelId}> has expired.`, 'Expire Lock');
        } catch (error) {
            console.error(error);
            log(`An error occurred while trying to expire ${this.channelId}'s channel lock.`, 'Expire Lock');
        }
    }

    public async lift(moderatorID: string): Promise<string> {
        const channel = client.channels.cache.get(this.channelId);
        if (!channel || (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildVoice)) return Promise.reject(`The channel <#${this.channelId}> could not be resolved.`);

        await this.originalPermissions.apply(channel);
        await this.delete();

        timeoutStore.delete(this);

        let logString = `${parseUser(moderatorID)} has lifted the channel lock in <#${this.channelId}>. \nIt would have expired at ${formatTimeDate(this.expireTimestamp)}.`;
        log(logString, 'Lift Lock');
        return logString;
    }

    async delete() {
        const result = await db.delete(schema.channelLock).where(sql.eq(schema.channelLock.id, this.id));
        if (result.rowCount === 0) return Promise.reject('Failed to delete channel lock.');
    }
}
