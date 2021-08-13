import { Command } from '../../commandHandler.js';
import { sendError, sendSuccess } from '../../lib/embeds.js';
import log from '../../lib/log.js';
import { parseUser } from '../../lib/misc.js';
import { closeTicket } from '../../lib/ticketManagement.js';

export const command: Command = {
    commands: ['close'],
    superCommands: ['modticket', 'mticket'],
    help: 'Close any open ticket.',
    expectedArgs: '<ticketID|ticketTitle|#ticketChannel>',
    minArgs: 1,
    maxArgs: null,
    requiredPermissions: ['MANAGE_MESSAGES'],
    callback: async (message, _, text) => {
        const { member, channel } = message;

        try {
            const ticket = await closeTicket(message.mentions.channels.first()?.id || text, member, true);
            sendSuccess(channel, 'Ticket closed.', 'Close Ticket');
            log(`${parseUser(message.author)} closed the ticket "${ticket.title}" by ${parseUser(ticket.author)}.`, 'Close Ticket');
        } catch (error) {
            if (error) sendError(channel, error);
        }
    },
};
