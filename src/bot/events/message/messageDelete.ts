import { Message, TextChannel } from 'discord.js';
import { db } from '../../../db/postgres.js';
import { settings } from '../../bot.js';
import { Event } from '../../eventHandler.js';
import log from '../../lib/log.js';
import { getGuild } from '../../lib/misc.js';
import { deleteAttachmentFromDiscord } from '../../lib/ticketManagement.js';

export const event: Event = {
    name: 'messageDelete',
    callback: async (message: Message) => {
        const { channel } = message;
        if (
            !(channel instanceof TextChannel) ||
            !channel.parentID ||
            !settings.ticket.categoryIDs.includes(channel.parentID) ||
            (!message.partial && (!message.author.bot || message.embeds.length === 0))
        )
            return;

        const comment = (
            await db.query(
                /*sql*/ `
                DELETE FROM comment
                USING ticket
                WHERE ticket.id = comment.ticket_id AND ticket.channel_id = $1 AND comment.message_id = $2
                RETURNING comment.content, comment.author_id, comment.attachment`,
                [channel.id, message.id]
            )
        ).rows[0];

        if (!comment) return;

        const guild = getGuild();
        if (comment.attachment && guild) deleteAttachmentFromDiscord(comment.attachment, guild);
        log(`<@${comment.author_id}>'s ticket comment has been deleted from <#${channel.id}>:\n\n${comment.content}`);
    },
};
