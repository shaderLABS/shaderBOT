import { Command } from '../../commandHandler.js';
import { Message } from 'discord.js';
import { settings } from '../../bot.js';
import { sendSuccess, sendError, sendInfo } from '../../lib/embeds.js';
import log from '../../lib/log.js';
import { openTicket } from '../../lib/ticketManagement.js';

export const command: Command = {
    commands: ['open'],
    help: 'Open any of your closed tickets.',
    expectedArgs: '<ticketID|ticketTitle>',
    minArgs: 1,
    maxArgs: null,
    superCommands: ['ticket'],
    callback: async (message: Message, args: string[], text: string) => {
        const { guild, channel, member } = message;
        if (!guild || !member || channel.id !== settings.ticket.managementChannelID) return;

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
