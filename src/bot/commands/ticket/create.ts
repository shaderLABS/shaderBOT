import { MessageEmbed, TextChannel } from 'discord.js';
import uuid from 'uuid-random';
import { db } from '../../../db/postgres.js';
import { settings } from '../../bot.js';
import { Command } from '../../commandHandler.js';
import { sendError, sendInfo } from '../../lib/embeds.js';
import log from '../../lib/log.js';
import { cacheAttachments, cutDescription, getCategoryChannel } from '../../lib/ticketManagement.js';

export const command: Command = {
    commands: ['create'],
    superCommands: ['ticket'],
    help: 'Create a new ticket.',
    minArgs: 0,
    maxArgs: 0,
    cooldownDuration: 20000,
    channelWhitelist: [settings.ticket.managementChannelID],
    callback: async (message) => {
        const { channel, author, guild } = message;

        const ticketEmbed = new MessageEmbed().setAuthor('Create Ticket').setColor('#006fff').setFooter(`Type '${settings.prefix}cancel' to stop.`).setTimestamp(Date.now());
        const ticketMessage = await channel.send(ticketEmbed);

        try {
            /*********
             * TITLE *
             *********/

            const titleQuestion = await sendInfo(channel, 'Please enter the title.');
            const titleAnswer = await awaitResponse(channel, author.id);
            let attachments = await cacheAttachments(titleAnswer);
            titleQuestion.delete();
            titleAnswer.delete();

            // VALIDATION
            if (titleAnswer.content.length > 32 || titleAnswer.content.length < 2) return sendError(channel, 'The title must be between 2 and 32 characters long.');
            if ((await db.query(/*sql*/ `SELECT 1 FROM ticket WHERE title = $1`, [titleAnswer.content])).rows[0]) return sendError(channel, 'A ticket with this name already exists.');
            ticketMessage.edit(ticketEmbed.setTitle(titleAnswer.content));

            /***********
             * PROJECT *
             ***********/

            const projectQuestion = await sendInfo(channel, 'Please mention the project.');
            const projectAnswer = await awaitResponse(channel, author.id);
            attachments = [...attachments, ...(await cacheAttachments(projectAnswer))];
            projectQuestion.delete();
            projectAnswer.delete();

            // VALIDATION
            const projectChannel = projectAnswer.mentions.channels.first();
            if (!projectChannel) return sendError(channel, 'The message does not contain a mentioned text channel.');
            if (!(await db.query(/*sql*/ `SELECT 1 FROM project WHERE channel_id = $1;`, [projectChannel.id])).rows[0]) return sendError(channel, 'The mentioned text channel is not a valid project.');
            ticketMessage.edit(ticketEmbed.addField('Project', projectChannel.toString()));

            /***************
             * DESCRIPTION *
             ***************/

            const descriptionQuestion = await sendInfo(channel, 'Please enter the description.');
            const descriptionAnswer = await awaitResponse(channel, author.id);
            attachments = [...attachments, ...(await cacheAttachments(descriptionAnswer))];
            descriptionQuestion.delete();
            descriptionAnswer.delete();

            // VALIDATION
            if (descriptionAnswer.content.length > 1024) return sendError(channel, 'The description may not be longer than 1024 characters.');
            if ((!attachments || attachments.length === 0) && !descriptionAnswer.content) return sendError(channel, 'The description may not be empty.');
            if (attachments.length > 3) return sendError(channel, 'The ticket may not contain more than 3 attachments');

            const ticketID = uuid();
            ticketMessage.edit(ticketEmbed.addField('Description', descriptionAnswer.content || 'NO DESCRIPTION').setFooter(`ID: ${ticketID}`));

            const subscriptionChannel = guild.channels.cache.get(settings.ticket.subscriptionChannelID);
            if (!(subscriptionChannel instanceof TextChannel)) return;

            const ticketChannel = await guild.channels.create(titleAnswer.content, {
                type: 'text',
                parent: await getCategoryChannel(settings.ticket.categoryIDs, guild),
                topic: `${ticketID} | <#${projectChannel.id}> | ${cutDescription(descriptionAnswer.content)}`,
                rateLimitPerUser: 10,
                // position: 0, // new - old
            });

            ticketEmbed.setAuthor(author.username + '#' + author.discriminator, author.displayAvatarURL() || undefined);

            const subscriptionMessage = await subscriptionChannel.send(ticketEmbed);
            ticketEmbed.attachFiles(attachments);

            ticketMessage.edit(ticketEmbed);
            ticketChannel.send(ticketEmbed);

            await db.query(
                /*sql*/ `
                INSERT INTO ticket (id, title, project_channel_id, description, attachments, author_id, timestamp, channel_id, subscription_message_id) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [ticketID, titleAnswer.content, projectChannel.id, descriptionAnswer.content, attachments, author.id, new Date(), ticketChannel.id, subscriptionMessage.id]
            );

            log(`<@${message.author.id}> created a ticket ("${titleAnswer.content}").`);
        } catch (error) {
            if (error) sendError(channel, error);
        }
    },
};

async function awaitResponse(channel: TextChannel, authorID: string) {
    const response = (
        await channel.awaitMessages((msg) => msg.author.id === authorID, {
            time: 60000,
            max: 1,
        })
    ).first();

    if (!response) {
        sendInfo(channel, 'Stopped ticket creation because there was no response.');
        return Promise.reject();
    }

    if (response.content === `${settings.prefix}cancel`) {
        sendInfo(channel, 'The ticket creation was canceled.');
        return Promise.reject();
    }

    return response;
}
