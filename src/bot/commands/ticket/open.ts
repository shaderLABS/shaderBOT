import { Command } from '../../commandHandler.js';
import { Message } from 'discord.js';
import { settings } from '../../bot.js';
import { getTicket } from '../../lib/searchMessage.js';
import { sendSuccess, sendError, sendInfo } from '../../lib/embeds.js';
import log from '../../lib/log.js';
import { openTicket } from '../../lib/tickets.js';

export const command: Command = {
    commands: ['open'],
    help: 'Open any of your closed tickets.',
    expectedArgs: '<ticketID|ticketTitle>',
    minArgs: 1,
    maxArgs: null,
    superCommands: ['ticket'],
    callback: async (message: Message, args: string[], text: string) => {
        const { guild, channel } = message;
        if (!guild || channel.id !== settings.ticket.managementChannelID) return;

        try {
            let ticket = await getTicket(message, args, text, true);

            const loadingEmbed = await sendInfo(channel, 'Opening ticket...');
            await openTicket(ticket, guild);
            await loadingEmbed.delete();

            sendSuccess(channel, 'Ticket opened.');
            log(`<@${message.author.id}> opened the ticket "${ticket.title}".`);
        } catch (error) {
            if (error) sendError(channel, error);
        }
    },
};
