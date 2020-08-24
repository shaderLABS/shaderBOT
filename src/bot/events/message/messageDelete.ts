import { Event } from '../../eventHandler.js';
import { Message, TextChannel } from 'discord.js';
import { settings } from '../../bot.js';
import Ticket from '../../../db/models/Ticket.js';
import log from '../../../misc/log.js';

export const event: Event = {
    name: 'messageDelete',
    callback: async (message: Message) => {
        const { channel } = message;
        if (!(channel instanceof TextChannel) || channel.parentID !== settings.ticketCategoryID || !channel.topic) return;

        if (!message.partial) if (!message.author.bot || message.embeds.length === 0) return;

        const ticket = await Ticket.findOne({ channel: channel.id });
        if (!ticket || !ticket.comments) return;

        const comment = ticket.comments.find((comment) => comment.message === message.id);
        if (!comment) return;

        comment.remove();
        ticket.save();
        log(`Removed ticket comment from <#${ticket.channel}>:\n\n${comment.content}`);
    },
};
