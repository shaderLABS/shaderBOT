import { settings } from '../../bot.js';
import { Command } from '../../commandHandler.js';
import { sendError, sendInfo, sendSuccess } from '../../lib/embeds.js';
import log from '../../lib/log.js';
import { openTicket } from '../../lib/ticketManagement.js';

export const command: Command = {
    commands: ['open'],
    superCommands: ['ticket'],
    help: 'Open any of your closed tickets.',
    expectedArgs: '<ticketID|ticketTitle>',
    minArgs: 1,
    maxArgs: null,
    cooldownDuration: 10000,
    callback: async (message, args, text) => {
        const { channel, member } = message;
        if (channel.id !== settings.ticket.managementChannelID) return;

        const loadingEmbed = await sendInfo(channel, 'Opening ticket...');

        try {
            const { title } = await openTicket(args, text, member);
            await loadingEmbed.delete();

            sendSuccess(channel, 'Ticket opened.');
            log(`<@${message.author.id}> opened the ticket "${title}".`);
        } catch (error) {
            await loadingEmbed.delete();
            if (error) sendError(channel, error);
        }
    },
};
