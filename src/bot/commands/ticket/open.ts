import { settings } from '../../bot.js';
import { Command } from '../../commandHandler.js';
import { sendError, sendInfo, sendSuccess } from '../../lib/embeds.js';
import log from '../../lib/log.js';
import { parseUser } from '../../lib/misc.js';
import { openTicket } from '../../lib/ticketManagement.js';

export const command: Command = {
    commands: ['open'],
    superCommands: ['ticket'],
    help: 'Open any of your closed tickets.',
    expectedArgs: '<ticketID|ticketTitle>',
    minArgs: 1,
    maxArgs: null,
    cooldownDuration: 10000,
    channelWhitelist: [settings.ticket.managementChannelID],
    callback: async (message, _, text) => {
        const { channel, member } = message;

        const loadingEmbed = await sendInfo(channel, 'Opening ticket...');

        try {
            const { title } = await openTicket(text, member);
            await loadingEmbed.delete();

            sendSuccess(channel, 'Ticket opened.');
            log(`${parseUser(message.author)} opened the ticket "${title}".`);
        } catch (error) {
            await loadingEmbed.delete();
            if (error) sendError(channel, error);
        }
    },
};
