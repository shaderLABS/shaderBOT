import { Command } from '../../commandHandler.js';
import { sendError, sendSuccess } from '../../lib/embeds.js';
import log from '../../lib/log.js';
import { parseUser } from '../../lib/misc.js';
import { deleteTicket } from '../../lib/ticketManagement.js';

export const command: Command = {
    commands: ['delete'],
    superCommands: ['modticket', 'mticket'],
    help: 'Delete any ticket.',
    expectedArgs: '<ticketID|ticketTitle|#ticketChannel>',
    minArgs: 1,
    maxArgs: null,
    requiredPermissions: ['MANAGE_MESSAGES'],
    callback: async (message, _, text) => {
        const { channel, guild } = message;

        try {
            const ticket = await deleteTicket(message.mentions.channels.first()?.id || text, guild);

            sendSuccess(channel, 'Ticket deleted.');
            log(`${parseUser(message.author)} deleted the ticket "${ticket.title}" by ${parseUser(ticket.author)}.`);
        } catch (error) {
            if (error) sendError(channel, error);
        }
    },
};
