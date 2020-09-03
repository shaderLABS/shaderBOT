import { Command } from '../../commandHandler.js';
import { Message, TextChannel } from 'discord.js';
import Ticket from '../../../db/models/Ticket.js';
import { getUser } from '../../lib/searchMessage.js';
import { client, settings } from '../../bot.js';
import { sendError, sendSuccess } from '../../lib/embeds.js';
import log from '../../lib/log.js';
import { purgeAllTickets } from '../../lib/tickets.js';

export const command: Command = {
    commands: ['purgeuser'],
    help: 'Purge all tickets by a specific user.',
    expectedArgs: '<@user|userID|username>',
    minArgs: 1,
    maxArgs: null,
    superCommands: ['modticket', 'mticket'],
    requiredPermissions: ['MANAGE_MESSAGES'],
    callback: async (message: Message, args: string[]) => {
        const { channel, guild } = message;
        if (!guild) return;

        try {
            const user = await getUser(message, args[0]);
            const ticket = await purgeAllTickets(user, guild);

            sendSuccess(channel, 'Purged all tickets.');
            log(`<@${message.author.id}> purged all tickets by <@${user.id}>:\n\n\`\`\`${ticket.titles.join('\n')}\`\`\``);
        } catch (error) {
            if (error) sendError(channel, error);
        }
    },
};
