import { Command } from '../../commandHandler.js';
import { Message } from 'discord.js';
import { client } from '../../bot.js';
import { getTicketMod } from '../../../misc/searchMessage.js';

export const command: Command = {
    commands: ['close'],
    expectedArgs: '<ticketID|ticketTitle>',
    minArgs: 1,
    maxArgs: null,
    requiredPermissions: ['MANAGE_MESSAGES'],
    superCommand: 'modticket',
    callback: async (message: Message, args: string[], text: string) => {
        const { member } = message;
        if (!member) return;

        try {
            let ticket = await getTicketMod(message, args, text, false);

            ticket.closed = true;

            if (ticket.channel) {
                (await client.channels.fetch(ticket.channel)).delete();
                ticket.channel = undefined;
            }

            await ticket.save();
            message.channel.send('Ticket closed.');
        } catch (error) {
            if (error) message.channel.send(error);
        }
    },
};
