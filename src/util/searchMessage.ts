import { User, Message } from 'discord.js';
import { client } from '../bot/bot.js';
import { ExtractDoc } from 'ts-mongoose';
import mongoose from 'mongoose';
import Ticket, { TicketSchema } from '../db/models/Ticket.js';
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

export async function getTicket(message: Message, args: string[], text: string): Promise<ExtractDoc<typeof TicketSchema>> {
    const id = args[1];
    const searchTitle = text.slice(args[0].length).trim();

    let ticket;
    if (mongoose.Types.ObjectId.isValid(id)) {
        ticket = (await Ticket.find({ $and: [{ _id: id }, { author: message.author.id }] }).exec())[0];

        if (!ticket) return Promise.reject(`There is no ticket with this ID that you have access to.`);
    } else {
        ticket = (await Ticket.find({ $and: [{ title: searchTitle }, { author: message.author.id }] }).exec())[0];

        if (!ticket) {
            const allTickets = await Ticket.find({ author: message.author.id }).exec();

            if (allTickets.length === 0) return Promise.reject(`There are no tickets that you have access to.`);

            allTickets.sort((a, b) => {
                return similarityLevenshtein(b.title, text) - similarityLevenshtein(a.title, text);
            });

            return Promise.reject(`No results found for "${searchTitle}". Did you mean "${allTickets[0].title}"?`);
        }
    }

    return ticket;
}

export async function getClosedTicket(message: Message, args: string[], text: string): Promise<ExtractDoc<typeof TicketSchema>> {
    const id = args[1];
    const searchTitle = text.slice(args[0].length).trim();

    let ticket;
    if (mongoose.Types.ObjectId.isValid(id)) {
        ticket = (await Ticket.find({ $and: [{ _id: id }, { closed: true }, { author: message.author.id }] }).exec())[0];

        if (!ticket) return Promise.reject(`There is no closed ticket with this ID that you have access to.`);
    } else {
        ticket = (await Ticket.find({ $and: [{ title: searchTitle }, { closed: true }, { author: message.author.id }] }).exec())[0];

        if (!ticket) {
            const allTickets = await Ticket.find({ $and: [{ closed: true }, { author: message.author.id }] }).exec();

            if (allTickets.length === 0) return Promise.reject(`There are no closed tickets that you have access to.`);

            allTickets.sort((a, b) => {
                return similarityLevenshtein(b.title, text) - similarityLevenshtein(a.title, text);
            });

            return Promise.reject(`No results found for "${searchTitle}". Did you mean "${allTickets[0].title}"?`);
        }
    }

    return ticket;
}

export async function getOpenTicket(message: Message, args: string[], text: string): Promise<ExtractDoc<typeof TicketSchema>> {
    const id = args[1];
    const searchTitle = text.slice(args[0].length).trim();

    let ticket;
    if (mongoose.Types.ObjectId.isValid(id)) {
        ticket = (await Ticket.find({ $and: [{ _id: id }, { closed: false }, { author: message.author.id }] }).exec())[0];

        if (!ticket) {
            return Promise.reject(`There is no open ticket with this ID that you have access to.`);
        }
    } else {
        ticket = (await Ticket.find({ $and: [{ title: searchTitle }, { closed: false }, { author: message.author.id }] }).exec())[0];

        if (!ticket) {
            const allTickets = await Ticket.find({ $and: [{ closed: false }, { author: message.author.id }] }).exec();

            if (allTickets.length === 0) {
                return Promise.reject(`There are no open tickets that you have access to.`);
            }

            allTickets.sort((a, b) => {
                return similarityLevenshtein(b.title, text) - similarityLevenshtein(a.title, text);
            });

            return Promise.reject(`No results found for "${searchTitle}". Did you mean "${allTickets[0].title}"?`);
        }
    }

    return ticket;
}
