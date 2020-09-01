import { Event } from '../../eventHandler.js';
import { Message, TextChannel } from 'discord.js';
import { settings } from '../../bot.js';
import Ticket from '../../../db/models/Ticket.js';
import log from '../../lib/log.js';
import { db } from '../../../db/postgres.js';

export const event: Event = {
    name: 'messageDelete',
    callback: async (message: Message) => {
        const { channel } = message;
        if (!(channel instanceof TextChannel) || channel.parentID !== settings.ticket.categoryID || !channel.topic) return;

        if (!message.partial) if (!message.author.bot || message.embeds.length === 0) return;

        const id = channel.topic.split(' | ')[0];

        const results = await db.query(
            `DELETE FROM comment 
            WHERE ticket_id = $1, message_id = $2 
            LIMIT 1`,
            [id, message.id]
        );

        if (results.rowCount === 0) return;

        // const ticket = await Ticket.findOne({ channel: channel.id });
        // if (!ticket || !ticket.comments) return;

        // const comment = ticket.comments.find((comment) => comment.message === message.id);
        // if (!comment) return;

        // comment.remove();
        // ticket.save();
        log(`Removed ticket comment from <#${channel}>:\n\n${results.rows[0].content}`);
    },
};
