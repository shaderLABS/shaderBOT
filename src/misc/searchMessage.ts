import { User, Message } from 'discord.js';
import { client } from '../bot/bot.js';
import { ExtractDoc } from 'ts-mongoose';
import mongoose from 'mongoose';
import Ticket, { TicketSchema } from '../db/models/Ticket.js';
import { similarityLevenshtein } from './similarity.js';
import Project from '../db/models/Project.js';

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
    const { member } = message;
    if (!member) return Promise.reject();
    const id = args[0];

    let ticket;
    if (mongoose.Types.ObjectId.isValid(id)) {
        if (member.permissions.has('MANAGE_MESSAGES')) {
            ticket = await Ticket.findById(id);
        } else {
            const projects: string[] = [];
            (await Project.find({ owners: member.id })).forEach((project) => projects.push(project.channel));

            ticket = await Ticket.findOne({ $and: [{ _id: id }, { $or: [{ author: message.author.id }, { project: { $in: projects } }] }] });
        }

        if (!ticket) return Promise.reject(`There is no ticket with this ID that you have access to.`);
    } else {
        if (member.permissions.has('MANAGE_MESSAGES')) {
            ticket = await Ticket.findOne({ title: text });
        } else {
            const projects: string[] = [];
            (await Project.find({ owners: member.id })).forEach((project) => projects.push(project.channel));

            ticket = await Ticket.findOne({
                $and: [{ title: text }, { $or: [{ author: message.author.id }, { project: { $in: projects } }] }],
            });
        }

        if (!ticket) {
            let allTickets;
            if (member.permissions.has('MANAGE_MESSAGES')) allTickets = await Ticket.find();
            else allTickets = await Ticket.find({ author: message.author.id });

            if (allTickets.length === 0) return Promise.reject(`There are no tickets that you have access to.`);

            allTickets.sort((a, b) => {
                return similarityLevenshtein(b.title, text) - similarityLevenshtein(a.title, text);
            });

            return Promise.reject(`No results found for "${text}". Did you mean "${allTickets[0].title}"?`);
        }
    }

    return ticket;
}

export async function getClosedTicket(message: Message, args: string[], text: string): Promise<ExtractDoc<typeof TicketSchema>> {
    const { member } = message;
    if (!member) return Promise.reject();
    const id = args[0];

    let ticket;
    if (mongoose.Types.ObjectId.isValid(id)) {
        if (member.permissions.has('MANAGE_MESSAGES')) {
            ticket = await Ticket.findOne({ $and: [{ _id: id }, { closed: true }] });
        } else {
            const projects: string[] = [];
            (await Project.find({ owners: member.id })).forEach((project) => projects.push(project.channel));

            ticket = await Ticket.findOne({
                $and: [{ _id: id }, { closed: true }, { $or: [{ author: message.author.id }, { project: { $in: projects } }] }],
            });
        }

        if (!ticket) return Promise.reject(`There is no closed ticket with this ID that you have access to.`);
    } else {
        if (member.permissions.has('MANAGE_MESSAGES')) {
            ticket = await Ticket.findOne({ $and: [{ title: text }, { closed: true }] });
        } else {
            const projects: string[] = [];
            (await Project.find({ owners: member.id })).forEach((project) => projects.push(project.channel));

            ticket = await Ticket.findOne({
                $and: [{ title: text }, { closed: true }, { $or: [{ author: message.author.id }, { project: { $in: projects } }] }],
            });
        }

        if (!ticket) {
            let allTickets;
            if (member.permissions.has('MANAGE_MESSAGES')) allTickets = await Ticket.find({ closed: true });
            else allTickets = await Ticket.find({ $and: [{ closed: true }, { author: message.author.id }] });

            if (allTickets.length === 0) return Promise.reject(`There are no closed tickets that you have access to.`);

            allTickets.sort((a, b) => {
                return similarityLevenshtein(b.title, text) - similarityLevenshtein(a.title, text);
            });

            return Promise.reject(`No results found for "${text}". Did you mean "${allTickets[0].title}"?`);
        }
    }

    return ticket;
}

export async function getOpenTicket(message: Message, args: string[], text: string): Promise<ExtractDoc<typeof TicketSchema>> {
    const { member } = message;
    if (!member) return Promise.reject();
    const id = args[0];

    let ticket;
    if (mongoose.Types.ObjectId.isValid(id)) {
        if (member.permissions.has('MANAGE_MESSAGES')) {
            ticket = await Ticket.findOne({ $and: [{ _id: id }, { closed: false }] });
        } else {
            const projects: string[] = [];
            (await Project.find({ owners: member.id })).forEach((project) => projects.push(project.channel));

            ticket = await Ticket.findOne({
                $and: [{ _id: id }, { closed: false }, { $or: [{ author: message.author.id }, { project: { $in: projects } }] }],
            });
        }

        if (!ticket) return Promise.reject(`There is no open ticket with this ID that you have access to.`);
    } else {
        if (member.permissions.has('MANAGE_MESSAGES')) {
            ticket = await Ticket.findOne({ $and: [{ title: text }, { closed: false }] });
        } else {
            const projects: string[] = [];
            (await Project.find({ owners: member.id })).forEach((project) => projects.push(project.channel));

            ticket = await Ticket.findOne({
                $and: [{ title: text }, { closed: false }, { $or: [{ author: message.author.id }, { project: { $in: projects } }] }],
            });
        }

        if (!ticket) {
            let allTickets;
            if (member.permissions.has('MANAGE_MESSAGES')) allTickets = await Ticket.find({ closed: false });
            else allTickets = await Ticket.find({ $and: [{ closed: false }, { author: message.author.id }] });

            if (allTickets.length === 0) return Promise.reject(`There are no open tickets that you have access to.`);

            allTickets.sort((a, b) => {
                return similarityLevenshtein(b.title, text) - similarityLevenshtein(a.title, text);
            });

            return Promise.reject(`No results found for "${text}". Did you mean "${allTickets[0].title}"?`);
        }
    }

    return ticket;
}
