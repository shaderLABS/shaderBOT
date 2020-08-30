import { Command } from '../../commandHandler.js';
import { Message } from 'discord.js';
import { getTicketMod } from '../../lib/searchMessage.js';
import { sendSuccess, sendError } from '../../lib/embeds.js';
import log from '../../lib/log.js';
import { closeTicket } from '../../lib/tickets.js';

export const command: Command = {
    commands: ['close'],
    help: 'Close any open ticket.',
    expectedArgs: '<ticketID|ticketTitle>',
    minArgs: 1,
    maxArgs: null,
    superCommands: ['modticket', 'mticket'],
    requiredPermissions: ['MANAGE_MESSAGES'],
    callback: async (message: Message, args: string[], text: string) => {
        const { guild, channel } = message;
        if (!guild) return;

        try {
            let ticket = await getTicketMod(message, args, text, false);
            closeTicket(ticket, guild);

            sendSuccess(channel, 'Ticket closed.');
            log(`<@${message.author.id}> closed the ticket "${ticket.title}" by <@${ticket.author}>.`);
        } catch (error) {
            if (error) sendError(channel, error);
        }
    },
};
