import { Command, syntaxError } from '../commandHandler.js';
import { Message } from 'discord.js';
import Ticket from '../../db/models/Ticket.js';
import { getUser, getTicket } from '../../misc/searchMessage.js';
import { client } from '../bot.js';

const expectedArgs = '<delete|purgeUser>';

export const command: Command = {
    commands: ['mod-ticket', 'modticket'],
    expectedArgs,
    minArgs: 1,
    maxArgs: null,
    requiredPermissions: ['MANAGE_MESSAGES'],
    callback: (message, args, text) => {
        switch (args[0].toLowerCase()) {
            case 'delete':
                deleteTicket(message, args, text);
                break;
            case 'purgeuser':
                purgeUserTickets(message, args);
                break;
            default:
                syntaxError(message.channel, 'mod-ticket ' + expectedArgs);
                break;
        }
    },
};

async function deleteTicket(message: Message, args: string[], text: string) {
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
}

async function purgeUserTickets(message: Message, args: string[]) {
    const { channel } = message;

    try {
        let user = await getUser(message, args[1]);
        const deleteTickets = await Ticket.find({ author: user.id });

        if (deleteTickets.length === 0) return channel.send(`No tickets by ${user.username} were found.`);

        for (const ticket of deleteTickets) {
            if (!ticket.closed && ticket.channel) {
                (await client.channels.fetch(ticket.channel)).delete();
            }
            ticket.deleteOne();
        }

        channel.send(`Deleted ${deleteTickets.length} ticket(s) by ${user.username}.`);
    } catch (error) {
        if (error) channel.send(error);
    }
}
