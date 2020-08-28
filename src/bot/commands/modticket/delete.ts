import { Command } from '../../commandHandler.js';
import { Message, TextChannel } from 'discord.js';
import { getTicketMod } from '../../lib/searchMessage.js';
import { client, settings } from '../../bot.js';
import { sendSuccess, sendError } from '../../lib/embeds.js';
import log from '../../lib/log.js';

export const command: Command = {
    commands: ['delete'],
    help: 'Delete any ticket.',
    expectedArgs: '<ticketID|ticketTitle>',
    minArgs: 1,
    maxArgs: null,
    superCommands: ['modticket'],
    requiredPermissions: ['MANAGE_MESSAGES'],
    callback: async (message: Message, args: string[], text: string) => {
        const { channel } = message;

        try {
            const ticket = await getTicketMod(message, args, text, undefined);

            if (ticket.channel) {
                (await client.channels.fetch(ticket.channel)).delete();
            }

            if (ticket.subscriptionMessage) {
                const { guild } = message;
                if (!guild) return;
                const subscriptionChannel = guild.channels.cache.get(settings.ticket.subscriptionChannelID);
                if (!(subscriptionChannel instanceof TextChannel)) return;

                (await subscriptionChannel.messages.fetch(ticket.subscriptionMessage)).delete();
                ticket.subscriptionMessage = '';
            }

            await ticket.deleteOne();
            sendSuccess(channel, 'Ticket deleted.');
            log(`<@${message.author.id}> deleted the ticket "${ticket.title}" by <@${ticket.author}>.`);
        } catch (error) {
            if (error) sendError(channel, error);
        }
    },
};
