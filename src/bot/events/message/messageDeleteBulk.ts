import { Collection, Message, Snowflake } from 'discord.js';
import { db } from '../../../db/postgres.js';
import { settings } from '../../bot.js';
import { Event } from '../../eventHandler.js';
import { isTextOrThreadChannel } from '../../lib/misc.js';
import { deleteAttachmentFromDiscord } from '../../lib/ticketManagement.js';

export const event: Event = {
    name: 'messageDeleteBulk',
    callback: (messages: Collection<Snowflake, Message>) => {
        const firstMessage = messages.first();
        if (!firstMessage) return;

        const { channel, guild } = firstMessage;
        if (!isTextOrThreadChannel(channel) || !channel.parentId || !settings.ticket.categoryIDs.includes(channel.parentId)) return;

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
