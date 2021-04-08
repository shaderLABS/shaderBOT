import { Command } from '../../commandHandler.js';
import { sendError, sendSuccess } from '../../lib/embeds.js';
import log from '../../lib/log.js';
import { parseUser } from '../../lib/misc.js';
import { getUser } from '../../lib/searchMessage.js';
import { purgeAllTickets } from '../../lib/ticketManagement.js';

export const command: Command = {
    commands: ['purgeuser'],
    superCommands: ['modticket', 'mticket'],
    help: 'Purge all tickets by a specific user.',
    expectedArgs: '<@user|userID|username>',
    minArgs: 1,
    maxArgs: null,
    requiredPermissions: ['MANAGE_MESSAGES'],
    callback: async (message, _, text) => {
        const { channel, guild } = message;

        try {
            const user = await getUser(text);
            const ticket = await purgeAllTickets(user, guild);

            sendSuccess(channel, 'Purged all tickets.');
            log(`${parseUser(message.author)} purged all tickets by ${parseUser(user)}:\n\n\`\`\`${ticket.titles.join('\n')}\`\`\``);
        } catch (error) {
            if (error) sendError(channel, error);
        }
    },
};
