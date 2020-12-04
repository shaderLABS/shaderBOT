import { Command } from '../../commandHandler.js';
import { Message } from 'discord.js';
import { sendSuccess, sendError } from '../../lib/embeds.js';
import log from '../../lib/log.js';
import { deleteTicket } from '../../lib/ticketManagement.js';

export const command: Command = {
    commands: ['delete'],
    help: 'Delete any ticket.',
    expectedArgs: '<ticketID|ticketTitle>',
    minArgs: 1,
    maxArgs: null,
    superCommands: ['modticket', 'mticket'],
    requiredPermissions: ['MANAGE_MESSAGES'],
    callback: async (message: Message, args: string[], text: string) => {
        const { channel, guild } = message;
        if (!guild) return;

        try {
            const ticket = await deleteTicket(args, text, guild);

            sendSuccess(channel, 'Ticket deleted.');
            log(`<@${message.author.id}> deleted the ticket "${ticket.title}" by <@${ticket.author}>.`);
        } catch (error) {
            if (error) sendError(channel, error);
        }
    },
};
