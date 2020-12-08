import { Command } from '../../commandHandler.js';
import { Message } from 'discord.js';
import { sendSuccess, sendError, sendInfo } from '../../lib/embeds.js';
import log from '../../lib/log.js';
import { openTicket } from '../../lib/ticketManagement.js';

export const command: Command = {
    commands: ['open'],
    help: 'Open any closed ticket.',
    expectedArgs: '<ticketID|ticketTitle>',
    minArgs: 1,
    maxArgs: null,
    superCommands: ['modticket', 'mticket'],
    requiredPermissions: ['MANAGE_MESSAGES'],
    callback: async (message: Message, args: string[], text: string) => {
        const { guild, channel, member } = message;
        if (!guild || !member) return;

        const loadingEmbed = await sendInfo(channel, 'Opening ticket...');

        try {
            const ticket = await openTicket(args, text, member, true);
            await loadingEmbed.delete();

            sendSuccess(channel, 'Ticket opened.');
            log(`<@${message.author.id}> opened the ticket "${ticket.title}" by <@${ticket.author}>.`);
        } catch (error) {
            await loadingEmbed.delete();
            if (error) sendError(channel, error);
        }
    },
};
