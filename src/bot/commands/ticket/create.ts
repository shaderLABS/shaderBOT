import { Command } from '../../commandHandler.js';
import mongoose from 'mongoose';
import Ticket from '../../../db/models/Ticket.js';
import { TextChannel, DMChannel, NewsChannel, MessageEmbed, Message } from 'discord.js';
import { settings } from '../../bot.js';
import Project from '../../../db/models/Project.js';
import { sendError, sendInfo } from '../../../misc/embeds.js';
import log from '../../../misc/log.js';

export const command: Command = {
    commands: ['create'],
    help: 'Create a new ticket.',
    minArgs: 0,
    maxArgs: 0,
    superCommands: ['ticket'],
    callback: async (message: Message) => {
        const { channel, author, guild } = message;
        if (!guild || channel.id !== settings.ticket.managementChannelID) return;

        const ticketEmbed = new MessageEmbed()
            .setTitle('CREATE TICKET')
            .setAuthor(author.username + '#' + author.discriminator, author.avatarURL() || undefined)
            .setColor('#006fff')
            .setFooter(`HINT: Type "${settings.prefix}cancel" to stop.`)
            .setTimestamp(Date.now());
        const ticketMessage = await channel.send(ticketEmbed);

        try {
            const titleQuestion = await sendInfo(channel, 'Please enter the title:');
            const title = await awaitResponse(channel, author.id);
            titleQuestion.delete();
            let attachments = await cacheAttachments(title);
            title.delete();
            ticketMessage.edit(ticketEmbed.addField('Title', title.content));

            if (title.content.length > 32 || title.content.length < 2) return sendError(channel, 'The title must be between 2 and 32 characters long!');
            if (await Ticket.exists({ title: title.content })) return sendError(channel, 'A ticket with this name already exists.');

            const projectQuestion = await sendInfo(channel, 'Please mention the project:');
            const project = await awaitResponse(channel, author.id);
            projectQuestion.delete();
            attachments = [...attachments, ...(await cacheAttachments(project))];
            project.delete();
            ticketMessage.edit(ticketEmbed.addField('Project', project.content));

            const projectChannel = project.mentions.channels.first();
            if (!projectChannel) return sendError(channel, 'The message does not contain a mentioned text channel.');
            if (!(await Project.exists({ channel: projectChannel.id }))) return sendError(channel, 'The mentioned text channel is not a valid project.');

            const descriptionQuestion = await sendInfo(channel, 'Please enter the description:');
            const description = await awaitResponse(channel, author.id);
            descriptionQuestion.delete();
            attachments = [...attachments, ...(await cacheAttachments(description))];
            description.delete();
            if (description.content.length > 1024) return sendError(channel, 'The description may not be longer than 1024 characters.');
            const ticketID = new mongoose.Types.ObjectId();
            ticketMessage.edit(ticketEmbed.addField('Description', description.content).setFooter(`ID: ${ticketID}`));

            const ticketChannel = await guild.channels.create(title.content, {
                type: 'text',
                parent: settings.ticket.categoryID,
                topic: `${ticketID} | <#${projectChannel.id}>`,
                rateLimitPerUser: 10,
            });

            const subscriptionChannel = guild.channels.cache.get(settings.ticket.subscriptionChannelID);
            if (!(subscriptionChannel instanceof TextChannel)) return;

            ticketEmbed.setTitle('');
            const subscriptionMessage = await subscriptionChannel.send(ticketEmbed);

            ticketEmbed.attachFiles(attachments);

            await ticketMessage.delete();
            channel.send(ticketEmbed);
            ticketChannel.send(ticketEmbed);

            Ticket.create({
                _id: ticketID,
                title: title.content,
                project: projectChannel.id,
                description: description.content,
                attachments: attachments,
                author: author.id,
                timestamp: new Date().toISOString(),
                closed: false,
                channel: ticketChannel.id,
                subscriptionMessage: subscriptionMessage.id,
            });

            log(`<@${message.author.id}> created a ticket ("${title.content}").`);
        } catch (error) {
            if (error) sendError(channel, error);
            return;
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

async function cacheAttachments(message: Message): Promise<string[]> {
    const attachmentURLs: string[] = [];

    if (message.attachments) {
        const attachmentStorage = message.guild?.channels.cache.get(settings.ticket.attachmentCacheChannelID);
        if (!attachmentStorage || !(attachmentStorage instanceof TextChannel)) return attachmentURLs;

        for (const attachment of message.attachments) {
            const storedAttachment = (await attachmentStorage.send(attachment)).attachments.first();
            if (storedAttachment) attachmentURLs.push(storedAttachment.url);
        }
    }

    return attachmentURLs;
}
