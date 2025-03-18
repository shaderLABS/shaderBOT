import { ChannelType, ThreadAutoArchiveDuration, type AnyThreadChannel } from 'discord.js';
import * as sql from 'drizzle-orm/sql';
import { db } from '../../db/postgres.ts';
import * as schema from '../../db/schema.ts';
import { client } from '../bot.ts';
import log from './log.ts';
import { parseUser } from './misc.ts';

export class StickyThread {
    public readonly id: string;
    public readonly channelId: string;
    public readonly threadId: string;
    public readonly moderatorId: string | null;

    public static readonly CHANNEL_TYPES = [ChannelType.PublicThread, ChannelType.PrivateThread] as const;

    constructor(data: typeof schema.stickyThread.$inferSelect) {
        this.id = data.id;
        this.channelId = data.channelId;
        this.threadId = data.threadId;
        this.moderatorId = data.moderatorId;
    }

    public static async getByUUID(uuid: string) {
        const result = await db.query.stickyThread.findFirst({ where: sql.eq(schema.stickyThread.id, uuid) });
        if (!result) return Promise.reject(`A sticky thread with the specified UUID does not exist.`);
        return new StickyThread(result);
    }

    public static async getByThreadID(threadId: string) {
        const result = await db.query.stickyThread.findFirst({ where: sql.eq(schema.stickyThread.threadId, threadId) });
        if (!result) return Promise.reject(`The specified thread is not sticky.`);
        return new StickyThread(result);
    }

    public static getAllStickyThreads() {
        return db.query.stickyThread.findMany({ columns: { threadId: true, channelId: true } });
    }

    public static async checkAllStickyThreads() {
        console.log('Checking for archived sticky threads...');

        return Promise.all(
            (await StickyThread.getAllStickyThreads()).map(async (stickyThread) => {
                const channel = client.channels.cache.get(stickyThread.channelId);
                if (channel?.type !== ChannelType.GuildText) return;

                const thread = await channel.threads.fetch(stickyThread.threadId).catch(() => undefined);
                if (!thread) return;

                if (thread.archived) {
                    thread.edit({
                        archived: false,
                        autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
                        reason: 'Sticky Thread',
                    });
                }
            }),
        );
    }

    public static async isSticky(threadId: string) {
        const result = await db.query.stickyThread.findFirst({
            columns: { id: true },
            where: sql.eq(schema.stickyThread.threadId, threadId),
        });
        return result !== undefined;
    }

    public static async create(thread: AnyThreadChannel, moderatorId: string | null = null): Promise<string> {
        if (!thread.parentId) return Promise.reject('The specified thread does not belong to a channel.');
        if (await StickyThread.isSticky(thread.id)) return Promise.reject('The specified thread is already marked as sticky.');

        const result = await db.insert(schema.stickyThread).values({
            channelId: thread.parentId,
            threadId: thread.id,
            moderatorId,
        });

        if (result.rowCount === 0) return Promise.reject('Failed to insert sticky thread.');

        thread.edit({
            archived: false,
            autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
            reason: 'Create Sticky Thread',
        });

        const logString = `${moderatorId ? parseUser(moderatorId) : 'System'} marked ${thread.toString()} as sticky.`;

        log(logString, 'Create Sticky Thread');
        return logString;
    }

    public async lift(moderatorID?: string) {
        const channel = client.channels.cache.get(this.channelId);
        if (channel?.type !== ChannelType.GuildText) return Promise.reject('Failed to resolve parent channel.');

        const thread = await channel.threads.fetch(this.threadId).catch(() => undefined);
        if (!thread) return Promise.reject('Failed to resolve thread.');

        this.delete();

        if (!thread.archived) {
            thread.edit({
                autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
                reason: 'Lift Sticky Thread',
            });
        }

        const logString = `${moderatorID ? parseUser(moderatorID) : 'System'} marked ${thread.toString()} as non-sticky.`;

        log(logString, 'Lift Sticky Thread');
        return logString;
    }

    public async delete() {
        const result = await db.delete(schema.stickyThread).where(sql.eq(schema.stickyThread.id, this.id));
        if (result.rowCount === 0) return Promise.reject(`Failed to delete sticky thread.`);
    }
}
