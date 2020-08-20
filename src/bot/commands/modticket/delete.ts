import { Command } from '../../commandHandler.js';
import { Message } from 'discord.js';
import { getTicket } from '../../../misc/searchMessage.js';
import { client } from '../../bot.js';

export const command: Command = {
    commands: ['delete'],
    expectedArgs: '<ticketID|ticketTitle>',
    minArgs: 1,
    maxArgs: null,
    superCommand: 'modticket',
    requiredPermissions: ['MANAGE_MESSAGES'],
    callback: async (message: Message, args: string[], text: string) => {
        const { channel } = message;

        try {
            const ticket = await getTicket(message, args, text);

            if (ticket.channel) {
                (await client.channels.fetch(ticket.channel)).delete();
            }

            await ticket.deleteOne();
            channel.send('Ticket deleted.');
        } catch (error) {
            if (error) channel.send(error);
        }
    },
};
