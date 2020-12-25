import { Command } from '../../commandHandler.js';
import { sendError, sendSuccess } from '../../lib/embeds.js';
import log from '../../lib/log.js';
import { deleteTicket } from '../../lib/ticketManagement.js';

export const command: Command = {
    commands: ['delete'],
    superCommands: ['modticket', 'mticket'],
    help: 'Delete any ticket.',
    expectedArgs: '<ticketID|ticketTitle>',
    minArgs: 1,
    maxArgs: null,
    requiredPermissions: ['MANAGE_MESSAGES'],
    callback: async (message, args, text) => {
        const { channel, guild } = message;

        try {
            const ticket = await deleteTicket(args, text, guild);

            sendSuccess(channel, 'Ticket deleted.');
            log(`<@${message.author.id}> deleted the ticket "${ticket.title}" by <@${ticket.author}>.`);
        } catch (error) {
            if (error) sendError(channel, error);
        }
    },
};
