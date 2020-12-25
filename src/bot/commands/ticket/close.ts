import { settings } from '../../bot.js';
import { Command } from '../../commandHandler.js';
import { sendError, sendSuccess } from '../../lib/embeds.js';
import log from '../../lib/log.js';
import { closeTicket } from '../../lib/ticketManagement.js';

export const command: Command = {
    commands: ['close'],
    superCommands: ['ticket'],
    help: 'Close any of your open tickets.',
    expectedArgs: '<ticketID|ticketTitle>',
    minArgs: 1,
    maxArgs: null,
    cooldownDuration: 10000,
    callback: async (message, args, text) => {
        const { channel, member } = message;
        if (channel.id !== settings.ticket.managementChannelID) return;

        try {
            const { title } = await closeTicket(args, text, member);
            sendSuccess(channel, 'Ticket closed.');
            log(`<@${message.author.id}> closed the ticket "${title}".`);
        } catch (error) {
            if (error) sendError(channel, error);
        }
    },
};
