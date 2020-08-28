import { Command } from '../../commandHandler.js';
import { Message } from 'discord.js';
import { getTicketMod } from '../../lib/searchMessage.js';
import { sendSuccess, sendError } from '../../lib/embeds.js';
import log from '../../lib/log.js';
import { openTicket } from '../../lib/tickets.js';

export const command: Command = {
    commands: ['open'],
    help: 'Open any closed ticket.',
    expectedArgs: '<ticketID|ticketTitle>',
    minArgs: 1,
    maxArgs: null,
    superCommands: ['modticket'],
    requiredPermissions: ['MANAGE_MESSAGES'],
    callback: async (message: Message, args: string[], text: string) => {
        const { guild } = message;
        if (!guild) return;

        try {
            let ticket = await getTicketMod(message, args, text, true);
            openTicket(ticket, guild);

            sendSuccess(message.channel, 'Ticket opened.');
            log(`<@${message.author.id}> opened the ticket "${ticket.title}" by <@${ticket.author}>.`);
        } catch (error) {
            if (error) sendError(message.channel, error);
        }
    },
};
