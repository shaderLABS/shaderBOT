import { Command, syntaxError } from '../commandHandler.js';
import mongoose from 'mongoose';
import Ticket from '../../db/models/Ticket.js';
import { Message, TextChannel, DMChannel, NewsChannel } from 'discord.js';

const expectedArgs = '<create|delete>';

export const command: Command = {
    commands: ['ticket'],
    expectedArgs,
    minArgs: 1,
    maxArgs: null,
    callback: (message, args) => {
        const { channel } = message;

        switch (args[0]) {
            case 'create':
                createTicket(message);
                break;
            case 'delete':
                break;
            default:
                syntaxError(channel, 'ticket ' + expectedArgs);
                break;
        }
    },
};

async function awaitResponse(text: string, channel: TextChannel | DMChannel | NewsChannel, authorID: string) {
    channel.send(text);
    const response = (
        await channel.awaitMessages((msg) => msg.author.id === authorID, {
            time: 30000,
            max: 1,
        })
    ).first();

    if (!response) return Promise.reject('Stopped ticket creation because there was no response.');

    return response.content;
}

async function createTicket(message: Message) {
    const { channel, author } = message;

    try {
        const title = await awaitResponse('Title:', channel, author.id);
        const topic = await awaitResponse('Topic:', channel, author.id);
        const description = await awaitResponse('Description:', channel, author.id);

        Ticket.create({
            _id: new mongoose.Types.ObjectId(),
            title,
            topic,
            description,
            closed: false,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        channel.send(error);
    }
}
