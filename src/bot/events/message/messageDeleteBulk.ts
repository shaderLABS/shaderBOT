import { Collection, Message, Snowflake, TextChannel } from 'discord.js';
import { db } from '../../../db/postgres.js';
import { settings } from '../../bot.js';
import { Event } from '../../eventHandler.js';
import { createBackup } from '../../lib/backup.js';
import log from '../../lib/log.js';
import { isTextOrThreadChannel } from '../../lib/misc.js';
import { deleteAttachmentFromDiscord } from '../../lib/ticketManagement.js';

export const event: Event = {
    name: 'messageDeleteBulk',
    callback: (messages: Collection<Snowflake, Message>) => {
        const firstMessage = messages.first();
        if (!firstMessage) return;

        const { channel, guild } = firstMessage;
        if (!isTextOrThreadChannel(channel)) return;

        createBackup(
            channel,
            messages.filter((message) => !message.partial),
            `Created after ${messages.size} messages were purged.`
        ).then((messageCount) => {
            if (messageCount > 0) {
                log(`${messageCount} out of ${messages.size} purged messages have been backed up. Use \`${settings.prefix}backup list\` in order to view them.`, 'Backup');
            }
        });

        if (!(channel instanceof TextChannel) || !channel.parentId || !settings.ticket.categoryIDs.includes(channel.parentId)) return;

        messages.forEach(async (message) => {
            const comment = (
                await db.query(
                    /*sql*/ `
                    DELETE FROM comment
                    USING ticket
                    WHERE ticket.id = comment.ticket_id AND ticket.channel_id = $1 AND comment.message_id = $2
                    RETURNING comment.content, comment.author_id, comment.attachment;`,
                    [channel.id, message.id]
                )
            ).rows[0];

            if (!comment) return;
            if (comment.attachment && guild) deleteAttachmentFromDiscord(comment.attachment, guild);
        });
    },
};
