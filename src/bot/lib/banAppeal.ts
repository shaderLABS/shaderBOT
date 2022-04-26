import { ThreadAutoArchiveDuration } from 'discord-api-types/v10';
import { EmbedBuilder, User, Util } from 'discord.js';
import { db } from '../../db/postgres.js';
import { client, settings } from '../bot.js';
import { embedColor, embedIcon } from './embeds.js';
import log from './log.js';
import { parseUser, trimString } from './misc.js';
import { Punishment } from './punishment.js';
import { formatTimeDate } from './time.js';

export class BanAppeal {
    public readonly id: string;
    public readonly userID: string;
    public readonly reason: string;
    public readonly timestamp: Date;
    public readonly messageID?: string;

    public result: 'pending' | 'declined' | 'accepted';
    public resultReason?: string;
    public resultModeratorID?: string;
    public resultTimestamp?: Date;
    public resultEditModeratorID?: string;
    public resultEditTimestamp?: Date;

    constructor(data: {
        id: string;
        user_id: string;
        reason: string;
        result: 'pending' | 'declined' | 'accepted';
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
        const result = await db.query(/*sql*/ `SELECT * FROM appeal WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 1;`, [userID]);
        if (result.rowCount === 0) return Promise.reject('The specified user does not have any ban appeals.');
        return new BanAppeal(result.rows[0]);
    }

    public static async getPendingByUserID(userID: string) {
        const result = await db.query(/*sql*/ `SELECT * FROM appeal WHERE user_id = $1 AND result = 'pending' LIMIT 1;`, [userID]);
        if (result.rowCount === 0) return Promise.reject('The specified user does not have any pending ban appeals.');
        return new BanAppeal(result.rows[0]);
    }

    static async getByUUID(uuid: string) {
        const result = await db.query(/*sql*/ `SELECT * FROM appeal WHERE id = $1;`, [uuid]);
        if (result.rowCount === 0) return Promise.reject(`A ban appeal with the specified UUID does not exist.`);
        return new BanAppeal(result.rows[0]);
    }

    static async getAllByUserID(userID: string) {
        const result = await db.query(/*sql*/ `SELECT * FROM appeal WHERE user_id = $1 ORDER BY timestamp DESC;`, [userID]);
        return result.rows.map((row) => new BanAppeal(row));
    }

    public static async hasPending(userID: string) {
        const result = await db.query(/*sql*/ `SELECT 1 FROM appeal WHERE user_id = $1 AND result = 'pending' LIMIT 1;`, [userID]);
        return !!result.rows[0];
    }

    public static async create(userID: string, reason: string) {
        if (reason.length < 1 || reason.length > 2000) return Promise.reject('The ban appeal reason must be between 1 and 2000 characters long.');

        const user = await client.users.fetch(userID).catch(() => undefined);
        if (!user) return Promise.reject('Failed to resolve the user.');

        if (await BanAppeal.hasPending(userID)) return Promise.reject('The specified user already has a pending ban appeal.');

        const appealChannel = client.channels.cache.get(settings.data.appealChannelID);
        if (!appealChannel?.isText()) return Promise.reject('The ban appeal channel was not found.');

        const timestamp = new Date();

        const result = await db.query(
            /*sql*/ `
            INSERT INTO appeal (user_id, reason, result, timestamp)
            VALUES ($1, $2, 'pending', $3)
            RETURNING id;`,
            [user.id, reason, timestamp]
        );

        if (result.rowCount === 0) return Promise.reject('Failed to insert punishment.');
        const { id } = result.rows[0];

        const appeal = new BanAppeal({ id, reason, result: 'pending', timestamp, user_id: user.id });

        const message = await appealChannel.send({ embeds: [appeal.toAppealEmbed(user)] });
        const thread = await message.startThread({
            name: user.username + "'s Ban Appeal",
            autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
        });

        thread.send(`<@&${settings.data.moderatorRoleID}>`);
        db.query(/*sql*/ `UPDATE appeal SET message_id = $1 WHERE id = $2;`, [message.id, id]);

        return appeal;
    }

    public async editResultReason(newResultReason: string, moderatorID: string) {
        if (this.result === 'pending') return Promise.reject('The ban appeal is still pending.');

        const oldResultReason = this.resultReason;
        const timestamp = new Date();

        const result = await db.query(
            /*sql*/ `
            UPDATE appeal
            SET result_reason = $1, result_edit_timestamp = $2, result_edit_mod_id = $3
            WHERE id = $4`,
            [newResultReason, timestamp, moderatorID, this.id]
        );
        if (result.rowCount === 0) return Promise.reject('Failed to edit the result reason of the ban appeal.');

        this.resultReason = newResultReason;
        this.resultModeratorID = moderatorID;
        this.resultEditTimestamp = timestamp;

        const logString = `${parseUser(this.resultModeratorID)} edited the result reason of ${parseUser(this.userID)}'s ban appeal (${this.id}).\n\n**Before**\n${
            oldResultReason || 'No reason provided.'
        }\n\n**After**\n${newResultReason}`;

        log(logString, 'Edit Ban Appeal Result Reason');
        return logString;
    }

    public async close(appealResult: 'declined' | 'accepted', reason: string, moderatorID: string) {
        if (this.result !== 'pending') return Promise.reject('The ban appeal is already closed.');

        const appealChannel = client.channels.cache.get(settings.data.appealChannelID);
        if (!appealChannel?.isText()) return Promise.reject('The ban appeal channel was not found.');

        const timestamp = new Date();

        const result = await db.query(
            /*sql*/ `
            UPDATE appeal
            SET result = $1, result_reason = $2, result_mod_id = $3, result_timestamp = $4
            WHERE id = $5;`,
            [appealResult, reason, moderatorID, timestamp, this.id]
        );
        if (result.rowCount === 0) return Promise.reject('Failed to close the ban appeal.');

        this.result = appealResult;
        this.resultReason = reason;
        this.resultModeratorID = moderatorID;
        this.resultTimestamp = timestamp;

        if (this.messageID) {
            const appealMessage = await appealChannel.messages.fetch(this.messageID).catch(() => undefined);
            if (appealMessage) {
                appealMessage.thread?.setArchived(true).catch(() => undefined);
                appealMessage.delete().catch(() => undefined);
            }
        }

        const logString = `${parseUser(this.userID)}'s ban appeal has been ${appealResult}.\n\n${this.toString()}`;

        log(logString, appealResult === 'accepted' ? 'Accept Ban Appeal' : 'Decline Ban Appeal');
        return logString;
    }

    public toAppealEmbed(user: User) {
        return new EmbedBuilder({
            author: {
                name: user.tag,
                iconURL: user.displayAvatarURL(),
            },
            title: 'Ban Appeal',
            color: embedColor.blue,
            description: `**User:** ${parseUser(user)}\n**Created At:** ${formatTimeDate(this.timestamp)}\n**ID:** ${this.id}\n\n${Util.escapeMarkdown(this.reason)}`,
        });
    }

    public toResultEmbed() {
        if (this.result === 'pending') {
            return new EmbedBuilder({
                author: {
                    name: 'Pending...',
                    iconURL: embedIcon.info,
                },
                color: embedColor.blue,
            });
        } else {
            if (!this.resultModeratorID || !this.resultTimestamp) throw 'The ban appeal result is invalid.';

            let description = `**Moderator:** ${parseUser(this.resultModeratorID)}\n**Created At:** ${formatTimeDate(this.resultTimestamp)}\n\n${Util.escapeMarkdown(
                this.resultReason || 'No reason provided.'
            )}`;

            if (this.resultEditTimestamp && this.resultEditModeratorID) {
                description += `\n\n*(last edited by ${parseUser(this.resultEditModeratorID)} at ${formatTimeDate(this.resultEditTimestamp)})*`;
            }

            const embed = new EmbedBuilder({ description });

            if (this.result === 'declined') {
                embed.setAuthor({
                    name: 'Declined',
                    iconURL: embedIcon.error,
                });
                embed.setColor(embedColor.red);
            } else {
                embed.setAuthor({
                    name: 'Accepted',
                    iconURL: embedIcon.success,
                });
                embed.setColor(embedColor.green);
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

        if (this.result !== 'pending') {
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

export async function getUserAppealData(userID: string) {
    const [ban, appeal] = await Promise.all([Punishment.getByUserID(userID, 'ban'), BanAppeal.getLatestByUserID(userID)]);
    const banModerator = ban.moderatorID ? await client.users.fetch(ban.moderatorID).catch(() => undefined) : undefined;

    return {
        id: ban.id,
        moderator: {
            id: banModerator?.id,
            username: banModerator?.username,
            discriminator: banModerator?.discriminator,
        },
        appeal: {
            result: appeal.result,
            result_reason: appeal.resultReason,
            result_timestamp: appeal.resultTimestamp,
            timestamp: appeal.timestamp,
        },
        reason: ban.reason,
        context_url: ban.contextURL,
        expire_timestamp: ban.expireTimestamp,
        timestamp: ban.timestamp,
    };
}
