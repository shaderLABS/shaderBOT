import { Event } from '../../eventHandler.js';
import { Message, TextChannel } from 'discord.js';
import { settings } from '../../bot.js';
import Ticket from '../../../db/models/Ticket.js';
import log from '../../../misc/log.js';

export const event: Event = {
    name: 'messageDelete',
    callback: async (message: Message) => {
        if (message.partial) {
            const { channel } = message;
            if (!(channel instanceof TextChannel) || channel.parentID !== settings.ticketCategoryID || !channel.topic) return;

            const ticket = await Ticket.findOne({ channel: channel.id });
            if (!ticket || !ticket.comments) return;

            const comment = ticket.comments.find((comment) => comment.message === message.id);
            if (!comment) return;

            comment.remove();
            log(`Removed ticket comment from <#${ticket.channel}>:\n\n${comment.content}`);
        } else {
            const { channel } = message;
            if (!message.author.bot || !(channel instanceof TextChannel) || channel.parentID !== settings.ticketCategoryID || !channel.topic) return;

            const embed = message.embeds[0];
            if (!embed || !embed.footer || !embed.footer.text) return;

            const ticket = await Ticket.findOne({ channel: channel.id });
            if (!ticket || !ticket.comments) return;

            const comment = ticket.comments.find((comment) => comment.message === message.id);
            if (!comment) return;

            comment.remove();
            log(`Removed ticket comment from <#${ticket.channel}>:\n\n${comment.content}`);
        }
    },
};
