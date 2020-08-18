import { Command, syntaxError } from '../commandHandler.js';
import mongoose from 'mongoose';
import Ticket from '../../db/models/Ticket.js';
import { Message, TextChannel, DMChannel, NewsChannel, MessageEmbed } from 'discord.js';
import { settings } from '../bot.js';

const expectedArgs = '<create|open|close>';

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
            case 'open':
                openTicket(message, args);
                break;
            case 'close':
                closeTicket(message, args);
                break;
            default:
                syntaxError(channel, 'ticket ' + expectedArgs);
                break;
        }
    },
};

async function awaitResponse(channel: TextChannel | DMChannel | NewsChannel, authorID: string) {
    const response = (
        await channel.awaitMessages((msg) => msg.author.id === authorID, {
            time: 30000,
            max: 1,
        })
    ).first();

    if (!response) return Promise.reject('Stopped ticket creation because there was no response.');
    if (response.content === `${settings.prefix}cancel`) return Promise.reject('The ticket creation was canceled.');

    return response;
}

async function createTicket(message: Message) {
    const { channel, author } = message;

    const ticketEmbed = new MessageEmbed()
        .setAuthor('CREATE TICKET')
        .setTitle(author.username + '#' + author.discriminator)
        .setColor('#0000ff')
        .setFooter(`HINT: Type "${settings.prefix}cancel" to stop.`);
    const ticketMessage = await channel.send(ticketEmbed);

    try {
        const titleQuestion = await channel.send('Please enter the title:');
        const title = await awaitResponse(channel, author.id);
        titleQuestion.delete();
        title.delete();
        ticketMessage.edit(ticketEmbed.addField('Title', title.content));

        const topicQuestion = await channel.send('Please enter the topic:');
        const topic = await awaitResponse(channel, author.id);
        topicQuestion.delete();
        topic.delete();
        ticketMessage.edit(ticketEmbed.addField('Topic', topic.content));

        const descriptionQuestion = await channel.send('Please enter the description:');
        const description = await awaitResponse(channel, author.id);
        descriptionQuestion.delete();
        description.delete();
        const ticketID = new mongoose.Types.ObjectId();
        ticketMessage.edit(ticketEmbed.addField('Description', description.content).setFooter(`ID: ${ticketID}`));

        Ticket.create({
            _id: ticketID,
            title: title.content,
            topic: topic.content,
            description: description.content,
            author: author.id,
            timestamp: new Date().toISOString(),
            closed: false,
        });
    } catch (error) {
        channel.send(error);
    }
}

async function closeTicket(message: Message, args: string[]) {
    const { channel, author } = message;
    const ticket = (await Ticket.find().where('_id', args[1]).where('closed', false).exec())[0];

    if (!ticket) {
        channel.send('No open ticket with this ID was found.');
        return;
    }

    if (ticket.author !== author.id) {
        channel.send('You do not have permission to close this ticket.');
        return;
    }

    ticket.closed = true;
    await ticket.save();
    channel.send('Ticket closed.');
}

async function openTicket(message: Message, args: string[]) {
    const { channel, author } = message;
    const ticket = (await Ticket.find().where('_id', args[1]).where('closed', true).exec())[0];

    if (!ticket) {
        channel.send('No closed ticket with this ID was found.');
        return;
    }

    if (ticket.author !== author.id) {
        channel.send('You do not have permission to open this ticket.');
        return;
    }

    ticket.closed = true;
    await ticket.save();
    channel.send('Ticket opened.');
}
