import { Command } from '../../commandHandler.js';
import { Message } from 'discord.js';
import { settings } from '../../bot.js';
import { sendSuccess, sendError } from '../../lib/embeds.js';
import log from '../../lib/log.js';
import { closeTicket } from '../../lib/ticketManagement.js';

export const command: Command = {
    commands: ['close'],
    help: 'Close any of your open tickets.',
    expectedArgs: '<ticketID|ticketTitle>',
    minArgs: 1,
    maxArgs: null,
    superCommands: ['ticket'],
    callback: async (message: Message, args: string[], text: string) => {
        const { guild, channel, member } = message;
        if (!guild || !member || channel.id !== settings.ticket.managementChannelID) return;

        try {
            const { title } = await closeTicket(args, text, member);
            sendSuccess(channel, 'Ticket closed.');
            log(`<@${message.author.id}> closed the ticket "${title}".`);
        } catch (error) {
            if (error) sendError(channel, error);
        }
    },
};
