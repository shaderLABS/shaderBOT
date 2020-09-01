import { User, Message } from 'discord.js';
import { client } from '../bot.js';
import { ExtractDoc } from 'ts-mongoose';
import mongoose from 'mongoose';
import Ticket, { TicketSchema } from '../../db/models/Ticket.js';
import { similarityLevenshtein } from './similarity.js';

export async function getUser(message: Message, potentialUser: string): Promise<User> {
    let user = message.mentions.users.first();
    if (!user) {
        user = client.users.cache.find((user) => user.username === potentialUser);
        if (!user) {
            try {
                if (!isNaN(Number(potentialUser))) user = await client.users.fetch(potentialUser);
                if (!user) return Promise.reject('Specified user not found.');
            } catch (error) {
                return Promise.reject('Specified user not found.');
            }
        }
    }

    return user;
}

export async function getTicketMod(message: Message, args: string[], text: string, closed: boolean | undefined): Promise<ExtractDoc<typeof TicketSchema>> {
    const { member } = message;
    if (!member) return Promise.reject();
    const id = args[0];

    let ticket;
    if (mongoose.Types.ObjectId.isValid(id)) {
        try {
            ticket = await Ticket.findById(id);
            if (!ticket) return Promise.reject(`There is no ticket with this ID.`);
        } catch {
            return Promise.reject(`There is no ticket with this ID.`);
        }
    } else {
        ticket = await Ticket.findOne({ title: text });

        if (!ticket) {
            let allTickets;

            if (closed === undefined) allTickets = await Ticket.find();
            else allTickets = await Ticket.find({ closed });

            if (allTickets.length === 0) return Promise.reject(`There are no existing tickets.`);

            allTickets.sort((a, b) => {
                return similarityLevenshtein(b.title, text) - similarityLevenshtein(a.title, text);
            });

            return Promise.reject(`No results found for "${text}". Did you mean "${allTickets[0].title}"?`);
        }
    }

    return ticket;
}
