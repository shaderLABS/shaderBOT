import { Command } from '../../commandHandler.js';
import uuid from 'uuid-random';
import { TextChannel, DMChannel, NewsChannel, MessageEmbed, Message } from 'discord.js';
import { settings } from '../../bot.js';
import { sendError, sendInfo } from '../../lib/embeds.js';
import log from '../../lib/log.js';
import { cacheAttachments } from '../../lib/tickets.js';
import { db } from '../../../db/postgres.js';

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

            if (title.content.length > 32 || title.content.length < 2) return sendError(channel, 'The title must be between 2 and 32 characters long.');
            if ((await db.query(/*sql*/ `SELECT EXISTS (SELECT 1 FROM ticket WHERE title=$1) AS "exists";`, [title.content])).rows[0].exists)
                return sendError(channel, 'A ticket with this name already exists.');

            const projectQuestion = await sendInfo(channel, 'Please mention the project:');
            const project = await awaitResponse(channel, author.id);
            projectQuestion.delete();
            attachments = [...attachments, ...(await cacheAttachments(project))];
            project.delete();
            ticketMessage.edit(ticketEmbed.addField('Project', project.content));

            const projectChannel = project.mentions.channels.first();
            if (!projectChannel) return sendError(channel, 'The message does not contain a mentioned text channel.');

            if (!(await db.query(/*sql*/ `SELECT EXISTS (SELECT 1 FROM project WHERE channel_id=$1) AS "exists";`, [projectChannel.id])).rows[0].exists)
                return sendError(channel, 'The mentioned text channel is not a valid project.');

            const descriptionQuestion = await sendInfo(channel, 'Please enter the description:');
            const description = await awaitResponse(channel, author.id);
            descriptionQuestion.delete();
            attachments = [...attachments, ...(await cacheAttachments(description))];
            description.delete();
            if (description.content.length > 1024) return sendError(channel, 'The description may not be longer than 1024 characters.');
            const ticketID = uuid();
            ticketMessage.edit(ticketEmbed.addField('Description', description.content).setFooter(`ID: ${ticketID}`));

            if ((!attachments || attachments.length === 0) && (!description.content || description.content === '')) {
                return sendError(channel, 'The description may not be empty.');
            }

            const subscriptionChannel = guild.channels.cache.get(settings.ticket.subscriptionChannelID);
            if (!(subscriptionChannel instanceof TextChannel)) return;

            const ticketChannel = await guild.channels.create(title.content, {
                type: 'text',
                parent: settings.ticket.categoryID,
                topic: `${ticketID} | <#${projectChannel.id}>`,
                rateLimitPerUser: 10,
            });

            ticketEmbed.setTitle('');
            const subscriptionMessage = await subscriptionChannel.send(ticketEmbed);

            ticketEmbed.attachFiles(attachments);

            await ticketMessage.delete();
            channel.send(ticketEmbed);
            ticketChannel.send(ticketEmbed);

            await db.query(
                /*sql*/ `
                INSERT INTO ticket (ticket_id, title, project_channel_id, description, attachments, author_id, timestamp, channel_id, subscription_message_id) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [ticketID, title.content, projectChannel.id, description.content, attachments, author.id, new Date(), ticketChannel.id, subscriptionMessage.id]
            );

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
