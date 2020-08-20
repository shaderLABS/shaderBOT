import { Command } from '../../commandHandler.js';
import { Message } from 'discord.js';
import { client } from '../../bot.js';
import { getOpenTicket } from '../../../misc/searchMessage.js';

export const command: Command = {
    commands: ['close'],
    expectedArgs: '<ticketID|ticketTitle>',
    minArgs: 1,
    maxArgs: null,
    superCommand: 'ticket',
    callback: async (message: Message, args: string[], text: string) => {
        const { member } = message;
        if (!member) return;
        try {
            // if (ticket.author !== member.id && !member.permissions.has('MANAGE_MESSAGES')) {
            //     const project = await Project.findOne({ channel: ticket.project });
            //     if (!project || !project.owners) return;
            //     if (!project.owners.includes(member.id)) return;
            // }

            let ticket = await getOpenTicket(message, args, text);

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
