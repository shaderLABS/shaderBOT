import { ThreadAutoArchiveDuration } from 'discord-api-types/v10';
import { ChannelType, EmbedBuilder, escapeMarkdown, SnowflakeUtil, time, TimestampStyles, User } from 'discord.js';
import { db } from '../../db/postgres.js';
import { API } from '../../web/api.js';
import { client, settings } from '../bot.js';
import { EmbedColor, EmbedIcon } from './embeds.js';
import log from './log.js';
import { getNumberWithOrdinalSuffix, parseUser, trimString } from './misc.js';
import { Ban } from './punishment/ban.js';
import { StickyThread } from './stickyThread.js';
import { formatTimeDate } from './time.js';

export class BanAppeal {
    public readonly id: string;
    public readonly userID: string;
    public readonly reason: string;
    public readonly timestamp: Date;
    public readonly messageID?: string;

    public result: 'pending' | 'declined' | 'accepted' | 'expired';
    public resultReason?: string;
    public resultModeratorID?: string;
    public resultTimestamp?: Date;
    public resultEditModeratorID?: string;
    public resultEditTimestamp?: Date;

    constructor(data: {
        id: string;
        user_id: string;
        reason: string;
        result: 'pending' | 'declined' | 'accepted' | 'expired';
        result_reason?: string;
        result_mod_id?: string;
        result_timestamp?: string | number | Date;
        result_edit_mod_id?: string;
        result_edit_timestamp?: string | number | Date;
        message_id?: string;
        timestamp: string | number | Date;
    }) {
        this.id = data.id;
        this.userID = data.user_id;
        this.reason = data.reason;
        this.timestamp = new Date(data.timestamp);
        this.messageID = data.message_id;
        this.result = data.result;
        this.resultReason = data.result_reason;
        this.resultModeratorID = data.result_mod_id;
        this.resultTimestamp = data.result_timestamp ? new Date(data.result_timestamp) : undefined;
        this.resultEditModeratorID = data.result_edit_mod_id;
        this.resultEditTimestamp = data.result_edit_timestamp ? new Date(data.result_edit_timestamp) : undefined;
    }

    public static async getLatestByUserID(userID: string) {
        const result = await db.query({ text: /*sql*/ `SELECT * FROM appeal WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 1;`, values: [userID], name: 'appeal-latest-user-id' });
        if (result.rowCount === 0) return Promise.reject('The specified user does not have any ban appeals.');
        return new BanAppeal(result.rows[0]);
    }

    public static async getPendingByUserID(userID: string) {
        const result = await db.query({ text: /*sql*/ `SELECT * FROM appeal WHERE user_id = $1 AND result = 'pending' LIMIT 1;`, values: [userID], name: 'appeal-pending-user-id' });
        if (result.rowCount === 0) return Promise.reject('The specified user does not have any pending ban appeals.');
        return new BanAppeal(result.rows[0]);
    }

    public static async getByUUID(uuid: string) {
        const result = await db.query({ text: /*sql*/ `SELECT * FROM appeal WHERE id = $1;`, values: [uuid], name: 'appeal-uuid' });
        if (result.rowCount === 0) return Promise.reject('A ban appeal with the specified UUID does not exist.');
        return new BanAppeal(result.rows[0]);
    }

    public static async getAllByUserID(userID: string) {
        const result = await db.query({ text: /*sql*/ `SELECT * FROM appeal WHERE user_id = $1 ORDER BY timestamp DESC;`, values: [userID], name: 'appeal-all-user-id' });
        return result.rows.map((row) => new BanAppeal(row));
    }

    public static async getByThreadID(threadID: string) {
        // thread channel ID === starter message ID
        const result = await db.query({ text: /*sql*/ `SELECT * FROM appeal WHERE message_id = $1 LIMIT 1;`, values: [threadID], name: 'appeal-thread-id' });
        if (result.rowCount === 0) return Promise.reject('A ban appeal with the specified thread ID does not exist.');
        return new BanAppeal(result.rows[0]);
    }

    public static async hasPending(userID: string) {
        const result = await db.query({ text: /*sql*/ `SELECT 1 FROM appeal WHERE user_id = $1 AND result = 'pending' LIMIT 1;`, values: [userID], name: 'appeal-has-pending' });
        return Boolean(result.rows[0]);
    }

    public static async getNumberOfAppealsByUserID(userID: string) {
        const result = await db.query({ text: /*sql*/ `SELECT COUNT(*) FROM appeal WHERE user_id = $1;`, values: [userID], name: 'appeal-count-all-user-id' });
        return Number(result.rows[0].count);
    }

    public static async getPreviousThreadsByUserID(userID: string): Promise<string[]> {
        const result = await db.query({ text: /*sql*/ `SELECT message_id FROM appeal WHERE user_id = $1 ORDER BY timestamp DESC;`, values: [userID], name: 'appeal-previous-threads-all-user-id' });
        return result.rows.map((row) => row.message_id);
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
        const timestamp = new Date();

        const result = await db.query({
            text: /*sql*/ `
                INSERT INTO appeal (user_id, reason, result, timestamp)
                VALUES ($1, $2, 'pending', $3)
                RETURNING id;`,
            values: [user.id, reason, timestamp],
            name: 'appeal-create',
        });

        if (result.rowCount === 0) return Promise.reject('Failed to insert punishment.');
        const { id } = result.rows[0];

        const appeal = new BanAppeal({ id, reason, result: 'pending', timestamp, user_id: user.id });
        const embed = appeal.toAppealEmbed(user);

        if (previousThreads.length > 0) {
            embed.addFields({
                name: `Previous Ban Appeals (${previousThreads.length})`,
                value: previousThreads.slice(0, 8).reduce((list, threadID, index) => {
                    return (
                        list +
                        `[${getNumberWithOrdinalSuffix(previousThreads.length - index)} Ban Appeal](https://www.discord.com/channels/${appealChannel.guildId}/${threadID}) - ${time(
                            Math.floor(SnowflakeUtil.timestampFrom(threadID) / 1000),
                            TimestampStyles.RelativeTime
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
        db.query({ text: /*sql*/ `UPDATE appeal SET message_id = $1 WHERE id = $2;`, values: [message.id, id], name: 'appeal-create-message-id' });

        return appeal;
    }

    public async editResultReason(newResultReason: string, moderatorID: string) {
        if (this.result === 'pending') return Promise.reject('The ban appeal is still pending.');
        if (this.result === 'expired') return Promise.reject('The ban appeal is expired.');

        const oldResultReason = this.resultReason;
        const timestamp = new Date();

        const result = await db.query({
            text: /*sql*/ `
                UPDATE appeal
                SET result_reason = $1, result_edit_timestamp = $2, result_edit_mod_id = $3
                WHERE id = $4`,
            values: [newResultReason, timestamp, moderatorID, this.id],
            name: 'appeal-edit-result-reason',
        });
        if (result.rowCount === 0) return Promise.reject('Failed to edit the result reason of the ban appeal.');

        this.resultReason = newResultReason;
        this.resultModeratorID = moderatorID;
        this.resultEditTimestamp = timestamp;

        const logString = trimString(
            `${parseUser(this.resultModeratorID)} edited the result reason of ${parseUser(this.userID)}'s ban appeal (${this.id}).\n\n**Before**\n${
                oldResultReason || 'No reason provided.'
            }\n\n**After**\n${newResultReason}`,
            4096
        );

        log(logString, 'Edit Ban Appeal Result Reason');
        return logString;
    }

    public async close(appealResult: 'declined' | 'accepted', reason: string, moderatorID: string) {
        if (this.result !== 'pending') return Promise.reject('The ban appeal is already closed.');

        const appealChannel = client.channels.cache.get(settings.data.appealChannelID);
        if (appealChannel?.type !== ChannelType.GuildText) return Promise.reject('The ban appeal channel was not found.');

        const timestamp = new Date();

        const result = await db.query({
            text: /*sql*/ `
                UPDATE appeal
                SET result = $1, result_reason = $2, result_mod_id = $3, result_timestamp = $4
                WHERE id = $5;`,
            values: [appealResult, reason, moderatorID, timestamp, this.id],
            name: 'appeal-close',
        });
        if (result.rowCount === 0) return Promise.reject('Failed to close the ban appeal.');

        this.result = appealResult;
        this.resultReason = reason;
        this.resultModeratorID = moderatorID;
        this.resultTimestamp = timestamp;

        if (this.messageID) {
            const appealMessage = await appealChannel.messages.fetch(this.messageID).catch(() => undefined);
            if (appealMessage) {
                if (appealMessage.thread) {
                    await appealMessage.thread.send({ embeds: [this.toAppealEmbed(await client.users.fetch(this.userID).catch(() => undefined)), this.toResultEmbed()] });
                    const stickyThread = await StickyThread.getByThreadID(appealMessage.thread.id).catch(() => undefined);
                    stickyThread?.lift();
                }

                appealMessage.delete().catch(() => undefined);
            }
        }

        const logString = `${parseUser(this.userID)}'s ban appeal has been ${appealResult}.\n\n${this.toString()}`;

        log(logString, appealResult === 'accepted' ? 'Accept Ban Appeal' : 'Decline Ban Appeal');
        return logString;
    }

    public async expire() {
        if (this.result !== 'pending') return Promise.reject('The ban appeal is already closed.');

        const appealChannel = client.channels.cache.get(settings.data.appealChannelID);
        if (appealChannel?.type !== ChannelType.GuildText) return Promise.reject('The ban appeal channel was not found.');

        const timestamp = new Date();

        const result = await db.query({
            text: /*sql*/ `
            UPDATE appeal
            SET result = $1, result_timestamp = $2
            WHERE id = $3;`,
            values: ['expired', timestamp, this.id],
            name: 'appeal-expire',
        });
        if (result.rowCount === 0) return Promise.reject('Failed to expire the ban appeal.');

        this.result = 'expired';
        this.resultTimestamp = timestamp;

        if (this.messageID) {
            const appealMessage = await appealChannel.messages.fetch(this.messageID).catch(() => undefined);
            if (appealMessage) {
                if (appealMessage.thread) {
                    await appealMessage.thread.send({ embeds: [this.toAppealEmbed(await client.users.fetch(this.userID).catch(() => undefined)), this.toResultEmbed()] });
                    const stickyThread = await StickyThread.getByThreadID(appealMessage.thread.id).catch(() => undefined);
                    stickyThread?.lift();
                }

                appealMessage.delete().catch(() => undefined);
            }
        }

        const logString = `${parseUser(this.userID)}'s ban appeal has expired.\n\n${this.toString()}`;

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
            description: `**User:** ${parseUser(user || this.userID)}\n**Created At:** ${formatTimeDate(this.timestamp)}\n**ID:** ${this.id}\n\n${escapeMarkdown(this.reason)}`,
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
            if (!this.resultModeratorID || !this.resultTimestamp) throw 'The ban appeal result is invalid.';

            let description = `**Moderator:** ${parseUser(this.resultModeratorID)}\n**Created At:** ${formatTimeDate(this.resultTimestamp)}\n\n${escapeMarkdown(
                this.resultReason || 'No reason provided.'
            )}`;

            if (this.resultEditTimestamp && this.resultEditModeratorID) {
                description += `\n\n*(last edited by ${parseUser(this.resultEditModeratorID)} at ${formatTimeDate(this.resultEditTimestamp)})*`;
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
            string += `**User:** ${parseUser(this.userID)}\n`;
        }

        string += `**Reason:** ${trimString(this.reason, 150)}\n**Created At:** ${formatTimeDate(this.timestamp)}\n**Result:** ${this.result}\n`;

        if (this.messageID) {
            string += `**Thread:** https://www.discord.com/channels/${settings.data.guildID}/${this.messageID}\n`;
        }

        if (this.result === 'expired') {
            if (!this.resultTimestamp) throw 'The ban appeal result is invalid.';

            string += `**Result Created At:** ${formatTimeDate(this.resultTimestamp)}\n`;
        } else if (this.result !== 'pending') {
            if (!this.resultModeratorID || !this.resultTimestamp) throw 'The ban appeal result is invalid.';

            string +=
                `**Result Reason:** ${trimString(this.resultReason || 'No reason provided.', 150)}\n` +
                `**Result Moderator:** ${parseUser(this.resultModeratorID)}\n` +
                `**Result Created At:** ${formatTimeDate(this.resultTimestamp)}\n`;
        }

        string += `**ID:** ${this.id}`;

        if (this.resultEditTimestamp && this.resultEditModeratorID) {
            string += `\n*(last edited by ${parseUser(this.resultEditModeratorID)} at ${formatTimeDate(this.resultEditTimestamp)})*`;
        }

        return string;
    }
}

export async function getUserAppealData(userID: string): Promise<API.BanInformation> {
    const [ban, appeal] = await Promise.all([Ban.getByUserID(userID), BanAppeal.getLatestByUserID(userID).catch(() => undefined)]);
    const banModerator = ban.moderatorID ? await client.users.fetch(ban.moderatorID).catch(() => undefined) : undefined;

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
                  resultReason: appeal.resultReason,
                  resultTimestamp: appeal.resultTimestamp?.toISOString(),
                  timestamp: appeal.timestamp.toISOString(),
              }
            : undefined,
        appealCooldown: settings.data.appealCooldown,
        reason: ban.reason,
        contextURL: ban.contextURL,
        expireTimestamp: ban.expireTimestamp?.toISOString(),
        timestamp: ban.timestamp.toISOString(),
    };
}
