import { settings } from '../../bot.js';
import { Command } from '../../commandHandler.js';
import { sendError, sendSuccess } from '../../lib/embeds.js';
import log from '../../lib/log.js';
import { parseUser } from '../../lib/misc.js';
import { closeTicket } from '../../lib/ticketManagement.js';

export const command: Command = {
    commands: ['close'],
    superCommands: ['ticket'],
    help: 'Close any of your open tickets.',
    expectedArgs: '<ticketID|ticketTitle>',
    minArgs: 1,
    maxArgs: null,
    cooldownDuration: 10000,
    channelWhitelist: [settings.ticket.managementChannelID],
    callback: async (message, args, text) => {
        const { channel, member } = message;

        try {
            const { title } = await closeTicket(args, text, member);
            sendSuccess(channel, 'Ticket closed.');
            log(`${parseUser(message.author)} closed the ticket "${title}".`);
        } catch (error) {
            if (error) sendError(channel, error);
        }
    },
};
