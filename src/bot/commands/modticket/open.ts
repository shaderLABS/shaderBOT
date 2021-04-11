import { Command } from '../../commandHandler.js';
import { sendError, sendInfo, sendSuccess } from '../../lib/embeds.js';
import log from '../../lib/log.js';
import { parseUser } from '../../lib/misc.js';
import { openTicket } from '../../lib/ticketManagement.js';

export const command: Command = {
    commands: ['open'],
    superCommands: ['modticket', 'mticket'],
    help: 'Open any closed ticket.',
    expectedArgs: '<ticketID|ticketTitle>',
    minArgs: 1,
    maxArgs: null,
    requiredPermissions: ['MANAGE_MESSAGES'],
    callback: async (message, _, text) => {
        const { channel, member } = message;

        const loadingEmbed = await sendInfo(channel, 'Opening ticket...');

        try {
            const ticket = await openTicket(text, member, true);
            await loadingEmbed.delete();

            sendSuccess(channel, 'Ticket opened.');
            log(`${parseUser(message.author)} opened the ticket "${ticket.title}" by ${parseUser(ticket.author)}.`);
        } catch (error) {
            await loadingEmbed.delete();
            if (error) sendError(channel, error);
        }
    },
};
