import { Guild, Message, MessageEmbed, TextChannel } from 'discord.js';
import uuid from 'uuid-random';
import { db } from '../../../db/postgres.js';
import { settings } from '../../bot.js';
import { Command } from '../../commandHandler.js';
import { embedColor, sendError, sendInfo } from '../../lib/embeds.js';
import log from '../../lib/log.js';
import { cacheAttachment, cutDescription, deleteAttachmentFromDiscord, getCategoryChannel } from '../../lib/ticketManagement.js';

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

        let question: Message | undefined;
        let attachments: (string | undefined)[] = [];

        try {
            /*********
             * TITLE *
             *********/

            question = await sendInfo(channel, 'Please enter the title.', 'Ticket Creation', undefined, `Type '${settings.prefix}cancel' to stop.`);
            const titleAnswer = await awaitResponse(channel, author.id);
            attachments.push(await cacheAttachment(titleAnswer));
            titleAnswer.delete();

            // VALIDATION
            if (titleAnswer.content.length > 32 || titleAnswer.content.length < 2)
                return sendErrorAndDelete(channel, 'The title must be between 2 and 32 characters long.', question, attachments, guild);
            if (uuid.test(titleAnswer.content)) return sendErrorAndDelete(channel, 'The title may not be or resemble an UUID.', question, attachments, guild);
            if ((await db.query(/*sql*/ `SELECT 1 FROM ticket WHERE title = $1`, [titleAnswer.content])).rows[0])
                return sendErrorAndDelete(channel, 'A ticket with this name already exists.', question, attachments, guild);

            /***********
             * PROJECT *
             ***********/

            await question.edit(question.embeds[0].setDescription('Please mention the project.'));
            const projectAnswer = await awaitResponse(channel, author.id);
            attachments.push(await cacheAttachment(projectAnswer));
            projectAnswer.delete();

            // VALIDATION
            const projectChannel = projectAnswer.mentions.channels.first();
            if (!projectChannel) return sendErrorAndDelete(channel, 'The message does not contain a mentioned text channel.', question, attachments, guild);
            if (projectChannel.parentID && settings.archiveCategoryIDs.includes(projectChannel.parentID))
                return sendErrorAndDelete(channel, 'The mentioned channel is archived.', question, attachments, guild);
            if (!(await db.query(/*sql*/ `SELECT 1 FROM project WHERE channel_id = $1;`, [projectChannel.id])).rows[0])
                return sendErrorAndDelete(channel, 'The mentioned text channel is not a valid project.', question, attachments, guild);

            /***************
             * DESCRIPTION *
             ***************/

            await question.edit(question.embeds[0].setDescription('Please enter the description.'));
            const descriptionAnswer = await awaitResponse(channel, author.id);
            attachments.push(await cacheAttachment(descriptionAnswer));
            attachments = attachments.filter(Boolean); // remove undefined values
            descriptionAnswer.delete();

            // VALIDATION
            if (descriptionAnswer.content.length > 1024) return sendErrorAndDelete(channel, 'The description may not be longer than 1024 characters.', question, attachments, guild);
            if ((!attachments || attachments.length === 0) && !descriptionAnswer.content) return sendErrorAndDelete(channel, 'The description may not be empty.', question, attachments, guild);

            question.delete();
            const ticketID = uuid();
            const date = new Date();

            const subscriptionChannel = guild.channels.cache.get(settings.ticket.subscriptionChannelID);
            if (!(subscriptionChannel instanceof TextChannel)) return;

            const ticketChannel = await guild.channels.create(titleAnswer.content, {
                type: 'text',
                parent: await getCategoryChannel(settings.ticket.categoryIDs, guild),
                topic: `${ticketID} | <#${projectChannel.id}> | ${cutDescription(descriptionAnswer.content)}`,
                rateLimitPerUser: 10,
                // position: 0, // new - old
            });

            const ticketEmbed = new MessageEmbed({
                color: embedColor.blue,
                author: {
                    name: author.username + '#' + author.discriminator,
                    iconURL: author.displayAvatarURL() || undefined,
                },
                title: titleAnswer.content,
                timestamp: date,
                footer: {
                    text: `ID: ${ticketID}`,
                },
                fields: [
                    {
                        name: 'Project',
                        value: projectChannel.toString(),
                    },
                    {
                        name: 'Description',
                        value: descriptionAnswer.content || 'NO DESCRIPTION',
                    },
                ],
            });

            const subscriptionMessage = await subscriptionChannel.send(ticketEmbed);

            if (attachments) ticketEmbed.attachFiles(attachments.map((attachment: any) => attachment.split('|')[0]));

            channel.send(ticketEmbed);
            ticketChannel.send(ticketEmbed);

            await db.query(
                /*sql*/ `
                INSERT INTO ticket (id, title, project_channel_id, description, attachments, author_id, timestamp, channel_id, subscription_message_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [ticketID, titleAnswer.content, projectChannel.id, descriptionAnswer.content, attachments, author.id, date, ticketChannel.id, subscriptionMessage.id]
            );

            log(`<@${message.author.id}> created a ticket ("${titleAnswer.content}").`);
        } catch (error) {
            if (question) question.delete();
            attachments.forEach((attachment) => {
                if (attachment) deleteAttachmentFromDiscord(attachment, guild);
            });

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

function sendErrorAndDelete(channel: TextChannel, message: string, question: Message, attachments: (string | undefined)[], guild: Guild) {
    question.delete();
    attachments.forEach((attachment) => {
        if (attachment) deleteAttachmentFromDiscord(attachment, guild);
    });

    sendError(channel, message);
}
