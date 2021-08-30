import { MessageEmbed } from 'discord.js';
import { db } from '../../../db/postgres.js';
import { Command } from '../../commandHandler.js';
import { embedIcon, sendError } from '../../lib/embeds.js';
import log from '../../lib/log.js';
import { formatContextURL, parseUser } from '../../lib/misc.js';
import { removeArgumentsFromText, requireUser } from '../../lib/searchMessage.js';
import { formatTimeDate } from '../../lib/time.js';

const expectedArgs = '<@user|userID|username> <content>';

export const command: Command = {
    commands: ['add'],
    superCommands: ['note'],
    help: 'Add a note to a user.',
    minArgs: 2,
    maxArgs: null,
    expectedArgs,
    requiredPermissions: ['KICK_MEMBERS'],
    callback: async (message, args, text) => {
        const { channel, author } = message;

        try {
            const user = await requireUser(args[0], { author, channel });

            const content = removeArgumentsFromText(text, args[0]);
            if (content.length < 1 || content.length > 500) return sendError(channel, 'The content must be between 1 and 500 characters long.');

            const timestamp = new Date();

            const result = (
                await db.query(
                    /*sql*/ `
                    INSERT INTO note (user_id, mod_id, content, context_url, timestamp)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING id;`,
                    [user.id, author.id, content, message.url, timestamp]
                )
            ).rows[0];
            if (!result || !result.id) return sendError(channel, 'Failed to insert note into the database.');

            const messageContent =
                `**User:** ${parseUser(user)}` +
                `\n**Content:** ${content}` +
                `\n**Moderator:** ${parseUser(author)}` +
                `\n**Context:** ${formatContextURL(message.url)}` +
                `\n**Created At:** ${formatTimeDate(timestamp)}`;

            channel.send({
                embeds: [
                    new MessageEmbed()
                        .setAuthor('Add Note', embedIcon.note)
                        .setColor('#ffc107')
                        .setDescription(messageContent)
                        .setFooter('ID: ' + result.id),
                ],
            });

            log(`${messageContent}\n**ID:** ${result.id}`, 'Add Note');
        } catch (error) {
            if (error) sendError(channel, error);
        }
    },
};
