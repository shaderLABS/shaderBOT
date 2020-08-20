import { Command, syntaxError } from '../commandHandler.js';
import mongoose from 'mongoose';
import Ticket from '../../db/models/Ticket.js';
import { Message, TextChannel, DMChannel, NewsChannel, MessageEmbed } from 'discord.js';
import { settings, client } from '../bot.js';
import { getOpenTicket, getClosedTicket } from '../../misc/searchMessage.js';
import Project from '../../db/models/Project.js';

const expectedArgs = '<create|open|close>';

export const command: Command = {
    commands: ['ticket'],
    expectedArgs,
    minArgs: 1,
    maxArgs: null,
    callback: (message, args, text) => {
        switch (args[0].toLowerCase()) {
            case 'create':
                createTicket(message);
                break;
            case 'open':
                openTicket(message, args, text);
                break;
            case 'close':
                closeTicket(message, args, text);
                break;
            default:
                syntaxError(message.channel, 'ticket ' + expectedArgs);
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
    const { channel, author, guild } = message;
    if (!guild) return;

    const ticketEmbed = new MessageEmbed()
        .setTitle('CREATE TICKET')
        .setAuthor(author.username + '#' + author.discriminator, author.avatarURL() || undefined)
        .setColor('#0000ff')
        .setFooter(`HINT: Type "${settings.prefix}cancel" to stop.`)
        .setTimestamp(Date.now());
    const ticketMessage = await channel.send(ticketEmbed);

    try {
        const titleQuestion = await channel.send('Please enter the title:');
        const title = await awaitResponse(channel, author.id);
        titleQuestion.delete();
        title.delete();
        ticketMessage.edit(ticketEmbed.addField('Title', title.content));

        if (title.content.length > 32 || title.content.length < 2) return channel.send('The title must be between 2 and 32 characters long!');
        if (await Ticket.exists({ title: title.content })) return channel.send('A ticket with this name already exists.');

        const projectQuestion = await channel.send('Please mention the project:');
        const project = await awaitResponse(channel, author.id);
        projectQuestion.delete();
        project.delete();
        ticketMessage.edit(ticketEmbed.addField('Project', project.content));

        const projectChannel = project.mentions.channels.first();
        if (!projectChannel) return channel.send('The message does not contain a mentioned text channel.');
        if (!(await Project.exists({ channel: projectChannel.id }))) return channel.send('The mentioned text channel is not a valid project.');

        const descriptionQuestion = await channel.send('Please enter the description:');
        const description = await awaitResponse(channel, author.id);
        descriptionQuestion.delete();
        description.delete();
        const ticketID = new mongoose.Types.ObjectId();
        ticketMessage.edit(ticketEmbed.addField('Description', description.content).setFooter(`ID: ${ticketID}`));

        const ticketChannel = await guild.channels.create(title.content, {
            type: 'text',
            parent: settings.ticketCategoryID,
            topic: `${ticketID} | ${project.content}`,
        });

        Ticket.create({
            _id: ticketID,
            title: title.content,
            project: project.content,
            description: description.content,
            author: author.id,
            timestamp: new Date().toISOString(),
            closed: false,
            channel: ticketChannel.id,
        });

        ticketEmbed.setTitle('');
        if (channel.id !== projectChannel.id) projectChannel.send(ticketEmbed);
        ticketChannel.send(ticketEmbed);
    } catch (error) {
        if (error) channel.send(error);
    }
}

async function closeTicket(message: Message, args: string[], text: string) {
    try {
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
        console.log(error);
    }
}

async function openTicket(message: Message, args: string[], text: string) {
    if (!message.guild) return;

    try {
        let ticket = await getClosedTicket(message, args, text);
        ticket.closed = false;

        const ticketChannel = await message.guild.channels.create(ticket.title, {
            type: 'text',
            parent: settings.ticketCategoryID,
            topic: `${ticket._id} | ${ticket.project}`,
        });
        ticket.channel = ticketChannel.id;

        const ticketAuthor = await client.users.fetch(ticket.author);

        const ticketEmbed = new MessageEmbed()
            .setAuthor(ticketAuthor.username + '#' + ticketAuthor.discriminator, ticketAuthor.avatarURL() || undefined)
            .setColor('#0000ff')
            .setFooter(`ID: ${ticket._id}`)
            .addFields([
                {
                    name: 'Title',
                    value: ticket.title,
                },
                {
                    name: 'Project',
                    value: `${ticket.project}`,
                },
                {
                    name: 'Description',
                    value: ticket.description,
                },
            ])
            .setTimestamp(new Date(ticket.timestamp));

        await ticketChannel.send(ticketEmbed);

        if (ticket.comments) {
            for (const comment of ticket.comments) {
                const author = await client.users.fetch(comment.author);
                await ticketChannel.send(
                    new MessageEmbed()
                        .setAuthor(author.username + '#' + author.discriminator, author.avatarURL() || undefined)
                        .setFooter('ID: ' + comment._id)
                        .setTimestamp(new Date(comment.timestamp))
                        .setDescription(comment.content)
                );
            }
        }

        await ticket.save();
        message.channel.send('Ticket opened.');
    } catch (error) {
        if (error) message.channel.send(error);
    }
}
