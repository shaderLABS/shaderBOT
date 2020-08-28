import { Command } from '../../commandHandler.js';
import { Message } from 'discord.js';
import { settings } from '../../bot.js';
import { getTicket } from '../../lib/searchMessage.js';
import { sendSuccess, sendError } from '../../lib/embeds.js';
import log from '../../lib/log.js';
import { closeTicket } from '../../lib/tickets.js';

export const command: Command = {
    commands: ['close'],
    help: 'Close any of your open tickets.',
    expectedArgs: '<ticketID|ticketTitle>',
    minArgs: 1,
    maxArgs: null,
    superCommands: ['ticket'],
    callback: async (message: Message, args: string[], text: string) => {
        const { guild, channel } = message;
        if (!guild || channel.id !== settings.ticket.managementChannelID) return;

        try {
            let ticket = await getTicket(message, args, text, false);
            await closeTicket(ticket, guild);

            sendSuccess(channel, 'Ticket closed.');
            log(`<@${message.author.id}> closed the ticket "${ticket.title}".`);
        } catch (error) {
            if (error) sendError(channel, error);
        }
    },
};
