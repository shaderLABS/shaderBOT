import { Command } from '../../commandHandler.js';
import { Message } from 'discord.js';
import { sendSuccess, sendError } from '../../lib/embeds.js';
import log from '../../lib/log.js';
import { closeTicket } from '../../lib/tickets.js';

export const command: Command = {
    commands: ['close'],
    help: 'Close any open ticket.',
    expectedArgs: '<ticketID|ticketTitle>',
    minArgs: 1,
    maxArgs: null,
    superCommands: ['modticket', 'mticket'],
    requiredPermissions: ['MANAGE_MESSAGES'],
    callback: async (message: Message, args: string[], text: string) => {
        const { guild, member, channel } = message;
        if (!guild || !member) return;

        try {
            const ticket = await closeTicket(args, text, member, true);
            sendSuccess(channel, 'Ticket closed.');
            log(`<@${message.author.id}> closed the ticket "${ticket.title}" by <@${ticket.author}>.`);
        } catch (error) {
            if (error) sendError(channel, error);
        }
    },
};
