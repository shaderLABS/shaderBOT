import { Command } from '../../commandHandler.js';
import { sendError, sendSuccess } from '../../lib/embeds.js';
import log from '../../lib/log.js';
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
    callback: async (message, args) => {
        const { channel, guild } = message;

        try {
            const user = await getUser(args[0], message.mentions);
            const ticket = await purgeAllTickets(user, guild);

            sendSuccess(channel, 'Purged all tickets.');
            log(`<@${message.author.id}> purged all tickets by <@${user.id}>:\n\n\`\`\`${ticket.titles.join('\n')}\`\`\``);
        } catch (error) {
            if (error) sendError(channel, error);
        }
    },
};
