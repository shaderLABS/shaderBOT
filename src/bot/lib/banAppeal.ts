import { ThreadAutoArchiveDuration } from 'discord-api-types/v10';
import { ChannelType, EmbedBuilder, escapeMarkdown, SnowflakeUtil, time, TimestampStyles, User } from 'discord.js';
import * as sql from 'drizzle-orm/sql';
import { db } from '../../db/postgres.ts';
import * as schema from '../../db/schema.ts';
import type { API } from '../../web/api.ts';
import { client, settings } from '../bot.ts';
import { EmbedColor, EmbedIcon } from './embeds.ts';
import log from './log.ts';
import { getNumberWithOrdinalSuffix, parseUser, trimString } from './misc.ts';
import { Ban } from './punishment/ban.ts';
import { StickyThread } from './stickyThread.ts';
import { formatTimeDate } from './time.ts';

export class BanAppeal {
    public readonly id: string;
    public readonly userId: string;
    public readonly reason: string;
    public readonly timestamp: Date;
    public readonly messageId: string | null;

    public result: 'pending' | 'declined' | 'accepted' | 'expired';
    public resultReason: string | null;
    public resultModeratorId: string | null;
    public resultTimestamp: Date | null;
    public resultEditModeratorId: string | null;
    public resultEditTimestamp: Date | null;

    constructor(data: typeof schema.appeal.$inferSelect) {
        this.id = data.id;
        this.userId = data.userId;
        this.reason = data.reason;
        this.timestamp = data.timestamp;
        this.messageId = data.messageId;
        this.result = data.result;
        this.resultReason = data.resultReason;
        this.resultModeratorId = data.resultModeratorId;
        this.resultTimestamp = data.resultTimestamp;
        this.resultEditModeratorId = data.resultEditModeratorId;
        this.resultEditTimestamp = data.resultEditTimestamp;
    }

    public static async getLatestByUserID(userId: string) {
        const result = await db.query.appeal.findFirst({ where: sql.eq(schema.appeal.userId, userId), orderBy: sql.desc(schema.appeal.timestamp) });
        if (!result) return Promise.reject('The specified user does not have any ban appeals.');
        return new BanAppeal(result);
    }

    public static async getPendingByUserID(userId: string) {
        const result = await db.query.appeal.findFirst({ where: sql.and(sql.eq(schema.appeal.userId, userId), sql.eq(schema.appeal.result, 'pending')) });
        if (!result) return Promise.reject('The specified user does not have any pending ban appeals.');
        return new BanAppeal(result);
    }

    public static async getByUUID(uuid: string) {
        const result = await db.query.appeal.findFirst({ where: sql.eq(schema.appeal.id, uuid) });
        if (!result) return Promise.reject('A ban appeal with the specified UUID does not exist.');
        return new BanAppeal(result);
    }

    public static async getAllByUserID(userId: string) {
        const result = await db.query.appeal.findMany({ where: sql.eq(schema.appeal.userId, userId), orderBy: sql.desc(schema.appeal.timestamp) });
        return result.map((entry) => new BanAppeal(entry));
    }

    public static async getByThreadID(threadId: string) {
        // thread channel ID === starter message ID
        const result = await db.query.appeal.findFirst({ where: sql.eq(schema.appeal.messageId, threadId) });
        if (!result) return Promise.reject('A ban appeal with the specified thread ID does not exist.');
        return new BanAppeal(result);
    }

    public static async hasPending(userId: string) {
        const result = await db.query.appeal.findFirst({
            columns: {},
            where: sql.and(sql.eq(schema.appeal.userId, userId), sql.eq(schema.appeal.result, 'pending')),
        });

        return result !== undefined;
    }

    public static async getNumberOfAppealsByUserID(userID: string) {
        const result = await db.select({ count: sql.count() }).from(schema.appeal).where(sql.eq(schema.appeal.userId, userID));
        return result[0].count;
    }

    public static async getPreviousThreadsByUserID(userId: string): Promise<string[]> {
        const result = await db.query.appeal.findMany({
            columns: { messageId: true },
            where: sql.eq(schema.appeal.userId, userId),
            orderBy: sql.desc(schema.appeal.timestamp),
        });

        return result.map((entry) => entry.messageId!);
    }

    public static async create(userID: string, reason: string) {
        if (reason.length < 1 || reason.length > 2000) return Promise.reject('The ban appeal reason must be between 1 and 2000 characters long.');

        const user = await client.users.fetch(userID).catch(() => undefined);
        if (!user) return Promise.reject('Failed to resolve the user.');

        const lastAppeal = await BanAppeal.getLatestByUserID(user.id).catch(() => undefined);
        if (lastAppeal) {
            if (lastAppeal.result === 'pending') return Promise.reject('The specified user already has a pending ban appeal.');
            if (lastAppeal.result === 'declined' && lastAppeal.resultTimestamp && Date.now() - lastAppeal.resultTimestamp.getTime() < settings.data.appealCooldown * 1000) {
                return Promise.reject('The specified user can not submit another ban appeal as they are still on cooldown.');
            }
        }

        const appealChannel = client.channels.cache.get(settings.data.appealChannelID);
        if (appealChannel?.type !== ChannelType.GuildText) return Promise.reject('The ban appeal channel was not found.');

        const previousThreads = await BanAppeal.getPreviousThreadsByUserID(user.id);

        const data = {
            userId: user.id,
            reason,
            result: 'pending',
            timestamp: new Date(),
        } satisfies typeof schema.appeal.$inferInsert;

        const result = await db.insert(schema.appeal).values(data).returning({ id: schema.appeal.id });

        if (result.length === 0) return Promise.reject('Failed to insert punishment.');
        const { id } = result[0];

        const appeal = new BanAppeal({
            id,
            messageId: null,
            resultReason: null,
            resultModeratorId: null,
            resultTimestamp: null,
            resultEditModeratorId: null,
            resultEditTimestamp: null,
            ...data,
        });

        const embed = appeal.toAppealEmbed(user);

        if (previousThreads.length > 0) {
            embed.addFields({
                name: `Previous Ban Appeals (${previousThreads.length})`,
                value: previousThreads.slice(0, 8).reduce((list, threadID, index) => {
                    return (
                        list +
                        `[${getNumberWithOrdinalSuffix(previousThreads.length - index)} Ban Appeal](https://www.discord.com/channels/${appealChannel.guildId}/${threadID}) - ${time(
                            Math.floor(SnowflakeUtil.timestampFrom(threadID) / 1000),
                            TimestampStyles.RelativeTime,
                        )}\n`
                    );
                }, ''),
            });
        }

        const message = await appealChannel.send({ embeds: [embed] });

        const thread = await message.startThread({
            name: `${user.username}'s ${getNumberWithOrdinalSuffix(previousThreads.length + 1)} Ban Appeal`,
            autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
        });

        thread.send(`<@&${settings.data.moderatorRoleID}>`);
        await db.update(schema.appeal).set({ messageId: thread.id }).where(sql.eq(schema.appeal.id, id));

        return appeal;
    }

    public async editResultReason(newResultReason: string, resultEditModeratorId: string) {
        if (this.result === 'pending') return Promise.reject('The ban appeal is still pending.');
        if (this.result === 'expired') return Promise.reject('The ban appeal is expired.');

        const oldResultReason = this.resultReason;
        const resultEditTimestamp = new Date();

        const result = await db
            .update(schema.appeal)
            .set({
                resultReason: newResultReason,
                resultEditTimestamp,
                resultEditModeratorId,
            })
            .where(sql.eq(schema.appeal.id, this.id));

        if (result.rowCount === 0) return Promise.reject('Failed to edit the result reason of the ban appeal.');

        this.resultReason = newResultReason;
        this.resultModeratorId = resultEditModeratorId;
        this.resultEditTimestamp = resultEditTimestamp;

        const logString = trimString(
            `${parseUser(this.resultModeratorId)} edited the result reason of ${parseUser(this.userId)}'s ban appeal (${this.id}).\n\n**Before**\n${
                oldResultReason || 'No reason provided.'
            }\n\n**After**\n${newResultReason}`,
            4096,
        );

        log(logString, 'Edit Ban Appeal Result Reason');
        return logString;
    }

    public async close(appealResult: 'declined' | 'accepted', reason: string, resultModeratorId: string) {
        if (this.result !== 'pending') return Promise.reject('The ban appeal is already closed.');

        const appealChannel = client.channels.cache.get(settings.data.appealChannelID);
        if (appealChannel?.type !== ChannelType.GuildText) return Promise.reject('The ban appeal channel was not found.');

        const resultTimestamp = new Date();

        const result = await db
            .update(schema.appeal)
            .set({
                result: appealResult,
                resultReason: reason,
                resultModeratorId,
                resultTimestamp,
            })
            .where(sql.eq(schema.appeal.id, this.id));

        if (result.rowCount === 0) return Promise.reject('Failed to close the ban appeal.');

        this.result = appealResult;
        this.resultReason = reason;
        this.resultModeratorId = resultModeratorId;
        this.resultTimestamp = resultTimestamp;

        if (this.messageId) {
            const appealMessage = await appealChannel.messages.fetch(this.messageId).catch(() => undefined);
            if (appealMessage) {
                if (appealMessage.thread) {
                    await appealMessage.thread.send({ embeds: [this.toAppealEmbed(await client.users.fetch(this.userId).catch(() => undefined)), this.toResultEmbed()] });
                    const stickyThread = await StickyThread.getByThreadID(appealMessage.thread.id).catch(() => undefined);
                    stickyThread?.lift();
                }

                appealMessage.delete().catch(() => undefined);
            }
        }

        const logString = `${parseUser(this.userId)}'s ban appeal has been ${appealResult}.\n\n${this.toString()}`;

        log(logString, appealResult === 'accepted' ? 'Accept Ban Appeal' : 'Decline Ban Appeal');
        return logString;
    }

    public async expire() {
        if (this.result !== 'pending') return Promise.reject('The ban appeal is already closed.');

        const appealChannel = client.channels.cache.get(settings.data.appealChannelID);
        if (appealChannel?.type !== ChannelType.GuildText) return Promise.reject('The ban appeal channel was not found.');

        const resultTimestamp = new Date();

        const result = await db.update(schema.appeal).set({ result: 'expired', resultTimestamp }).where(sql.eq(schema.appeal.id, this.id));
        if (result.rowCount === 0) return Promise.reject('Failed to expire the ban appeal.');

        this.result = 'expired';
        this.resultTimestamp = resultTimestamp;

        if (this.messageId) {
            const appealMessage = await appealChannel.messages.fetch(this.messageId).catch(() => undefined);
            if (appealMessage) {
                if (appealMessage.thread) {
                    await appealMessage.thread.send({ embeds: [this.toAppealEmbed(await client.users.fetch(this.userId).catch(() => undefined)), this.toResultEmbed()] });
                    const stickyThread = await StickyThread.getByThreadID(appealMessage.thread.id).catch(() => undefined);
                    stickyThread?.lift();
                }

                appealMessage.delete().catch(() => undefined);
            }
        }

        const logString = `${parseUser(this.userId)}'s ban appeal has expired.\n\n${this.toString()}`;

        log(logString, 'Expire Ban Appeal');
        return logString;
    }

    public toAppealEmbed(user: User | undefined) {
        return new EmbedBuilder({
            author: user
                ? {
                      name: user.username,
                      iconURL: user.displayAvatarURL(),
                  }
                : undefined,
            title: 'Ban Appeal',
            color: EmbedColor.Blue,
            description: `**User:** ${parseUser(user || this.userId)}\n**Created At:** ${formatTimeDate(this.timestamp)}\n**ID:** ${this.id}\n\n${escapeMarkdown(this.reason)}`,
        });
    }

    public toResultEmbed() {
        if (this.result === 'pending') {
            return new EmbedBuilder({
                author: {
                    name: 'Pending...',
                    iconURL: EmbedIcon.Info,
                },
                color: EmbedColor.Blue,
            });
        } else if (this.result === 'expired') {
            if (!this.resultTimestamp) throw 'The ban appeal result is invalid.';

            return new EmbedBuilder({
                author: {
                    name: 'Expired',
                    iconURL: EmbedIcon.Log,
                },
                description: `**Created At:** ${formatTimeDate(this.resultTimestamp)}`,
            });
        } else {
            if (!this.resultModeratorId || !this.resultTimestamp) throw 'The ban appeal result is invalid.';

            let description = `**Moderator:** ${parseUser(this.resultModeratorId)}\n**Created At:** ${formatTimeDate(this.resultTimestamp)}\n\n${escapeMarkdown(
                this.resultReason || 'No reason provided.',
            )}`;

            if (this.resultEditTimestamp && this.resultEditModeratorId) {
                description += `\n\n*(last edited by ${parseUser(this.resultEditModeratorId)} at ${formatTimeDate(this.resultEditTimestamp)})*`;
            }

            const embed = new EmbedBuilder({ description });

            if (this.result === 'declined') {
                embed.setAuthor({
                    name: 'Declined',
                    iconURL: EmbedIcon.Error,
                });
                embed.setColor(EmbedColor.Red);
            } else {
                embed.setAuthor({
                    name: 'Accepted',
                    iconURL: EmbedIcon.Success,
                });
                embed.setColor(EmbedColor.Green);
            }

            return embed;
        }
    }

    public toString(includeUser: boolean = true) {
        let string = '';

        if (includeUser) {
            string += `**User:** ${parseUser(this.userId)}\n`;
        }

        string += `**Reason:** ${trimString(this.reason, 150)}\n**Created At:** ${formatTimeDate(this.timestamp)}\n**Result:** ${this.result}\n`;

        if (this.messageId) {
            string += `**Thread:** https://www.discord.com/channels/${settings.data.guildID}/${this.messageId}\n`;
        }

        if (this.result === 'expired') {
            if (!this.resultTimestamp) throw 'The ban appeal result is invalid.';

            string += `**Result Created At:** ${formatTimeDate(this.resultTimestamp)}\n`;
        } else if (this.result !== 'pending') {
            if (!this.resultModeratorId || !this.resultTimestamp) throw 'The ban appeal result is invalid.';

            string +=
                `**Result Reason:** ${trimString(this.resultReason || 'No reason provided.', 150)}\n` +
                `**Result Moderator:** ${parseUser(this.resultModeratorId)}\n` +
                `**Result Created At:** ${formatTimeDate(this.resultTimestamp)}\n`;
        }

        string += `**ID:** ${this.id}`;

        if (this.resultEditTimestamp && this.resultEditModeratorId) {
            string += `\n*(last edited by ${parseUser(this.resultEditModeratorId)} at ${formatTimeDate(this.resultEditTimestamp)})*`;
        }

        return string;
    }
}

export async function getUserAppealData(userID: string): Promise<API.BanInformation> {
    const [ban, appeal] = await Promise.all([Ban.getByUserID(userID), BanAppeal.getLatestByUserID(userID).catch(() => undefined)]);
    const banModerator = ban.moderatorId ? await client.users.fetch(ban.moderatorId).catch(() => undefined) : undefined;

    return {
        id: ban.id,
        moderator: banModerator
            ? {
                  id: banModerator.id,
                  username: banModerator.username,
              }
            : undefined,
        appeal: appeal
            ? {
                  result: appeal.result,
                  resultReason: appeal.resultReason ?? undefined,
                  resultTimestamp: appeal.resultTimestamp?.toISOString(),
                  timestamp: appeal.timestamp.toISOString(),
              }
            : undefined,
        appealCooldown: settings.data.appealCooldown,
        reason: ban.reason,
        contextURL: ban.contextUrl ?? undefined,
        expireTimestamp: ban.expireTimestamp?.toISOString(),
        timestamp: ban.timestamp.toISOString(),
    };
}
