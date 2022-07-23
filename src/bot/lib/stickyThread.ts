import { AnyThreadChannel, ChannelType, ThreadAutoArchiveDuration } from 'discord.js';
import { db } from '../../db/postgres.js';
import log from './log.js';
import { getGuild, parseUser } from './misc.js';

export class StickyThread {
    public readonly id: string;
    public readonly channelID: string;
    public readonly threadID: string;
    public readonly moderatorID?: string;

    constructor(data: { id: string; channel_id: string; thread_id: string; mod_id?: string }) {
        this.id = data.id;
        this.channelID = data.channel_id;
        this.threadID = data.thread_id;
        this.moderatorID = data.mod_id;
    }

    public static async getByUUID(uuid: string) {
        const result = await db.query(/*sql*/ `SELECT * FROM sticky_thread WHERE id = $1;`, [uuid]);
        if (result.rowCount === 0) return Promise.reject(`A sticky thread with the specified UUID does not exist.`);
        return new StickyThread(result.rows[0]);
    }

    public static async getByThreadID(threadID: string) {
        const result = await db.query(/*sql*/ `SELECT * FROM sticky_thread WHERE thread_id = $1;`, [threadID]);
        if (result.rowCount === 0) return Promise.reject(`The specified thread is not sticky.`);
        return new StickyThread(result.rows[0]);
    }

    public static async getAllStickyThreads(): Promise<{ thread_id: string; channel_id: string }[]> {
        const result = await db.query(/*sql*/ `SELECT thread_id, channel_id FROM sticky_thread;`);
        return result.rows;
    }

    public static async checkAllStickyThreads() {
        const guild = getGuild();
        if (!guild) return Promise.reject('No guild found.');

        console.log('Checking for archived sticky threads...');

        return Promise.all(
            (await StickyThread.getAllStickyThreads()).map(async (stickyThread) => {
                const channel = guild.channels.cache.get(stickyThread.channel_id);
                if (channel?.type !== ChannelType.GuildText) return;

                const thread = await channel.threads.fetch(stickyThread.thread_id).catch(() => undefined);
                if (!thread) return;

                if (thread.archived) {
                    thread.edit({
                        archived: false,
                        autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
                        reason: 'Sticky Thread',
                    });
                }
            })
        );
    }

    public static async isSticky(threadID: string) {
        const result = await db.query(/*sql*/ `SELECT 1 FROM sticky_thread WHERE thread_id = $1 LIMIT 1;`, [threadID]);
        return !!result.rows[0];
    }

    public static async create(thread: AnyThreadChannel, moderatorID?: string): Promise<string> {
        if (await StickyThread.isSticky(thread.id)) return Promise.reject('The specified thread is already marked as sticky.');

        const result = await db.query(
            /*sql*/ `
            INSERT INTO sticky_thread (channel_id, thread_id, mod_id)
            VALUES ($1, $2, $3)
            RETURNING id;`,
            [thread.parentId, thread.id, moderatorID]
        );

        if (result.rowCount === 0) return Promise.reject('Failed to insert sticky thread.');

        thread.edit({
            archived: false,
            autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
            reason: 'Create Sticky Thread',
        });

        const logString = `${moderatorID ? parseUser(moderatorID) : 'System'} marked ${thread.toString()} as sticky.`;

        log(logString, 'Create Sticky Thread');
        return logString;
    }

    public async lift(moderatorID?: string) {
        const guild = getGuild();
        if (!guild) return Promise.reject('No guild found.');

        const channel = guild.channels.cache.get(this.channelID);
        if (channel?.type !== ChannelType.GuildText) return Promise.reject('Failed to resolve parent channel.');

        const thread = await channel.threads.fetch(this.threadID).catch(() => undefined);
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
        const result = await db.query(/*sql*/ `DELETE FROM sticky_thread WHERE id = $1 RETURNING id;`, [this.id]);
        if (result.rowCount === 0) return Promise.reject(`Failed to delete sticky thread.`);
    }
}
