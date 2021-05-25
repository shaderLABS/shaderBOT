import { MessageEmbed } from 'discord.js';
import uuid from 'uuid-random';
import { db } from '../../../db/postgres.js';
import { Command } from '../../commandHandler.js';
import { embedIcon, embedPages, sendError } from '../../lib/embeds.js';
import { parseUser } from '../../lib/misc.js';
import { requireUser } from '../../lib/searchMessage.js';
import { formatTimeDate } from '../../lib/time.js';

const expectedArgs = '<@user|userID|username|uuid>';

export const command: Command = {
    commands: ['list'],
    superCommands: ['note'],
    help: 'Display all notes from a user or a specific note.',
    minArgs: 1,
    maxArgs: null,
    expectedArgs,
    requiredPermissions: ['KICK_MEMBERS'],
    callback: async (message, args, text) => {
        const { channel, author } = message;

        try {
            if (uuid.test(args[0])) {
                // <ID>

                const note = (
                    await db.query(
                        /*sql*/ `
                        SELECT user_id, mod_id, content, timestamp, edited_timestamp, edited_mod_id FROM note WHERE id = $1 LIMIT 1;`,
                        [args[0]]
                    )
                ).rows[0];

                if (!note) return sendError(channel, 'There is no note with this ID.');

                const messageContent =
                    `**User:** ${parseUser(note.user_id)}\n` +
                    `**Content:** ${note.content}\n` +
                    `**Moderator:** ${parseUser(note.mod_id)}\n` +
                    `**Created At:** ${formatTimeDate(new Date(note.timestamp))}` +
                    (note.edited_timestamp ? `\n*(last edited by ${parseUser(note.edited_mod_id)} at ${formatTimeDate(new Date(note.edited_timestamp))})*` : '');

                channel.send(
                    new MessageEmbed()
                        .setAuthor('Note', embedIcon.note)
                        .setColor('#ffc107')
                        .setDescription(messageContent)
                        .setFooter('ID: ' + args[0])
                );
            } else {
                // <@user|userID|username>

                const user = await requireUser(text);

                const notes = (
                    await db.query(
                        /*sql*/ `
                        SELECT * FROM note WHERE user_id = $1 ORDER BY timestamp DESC;`,
                        [user.id]
                    )
                ).rows;
                if (notes.length === 0) return sendError(channel, 'There are no notes for this user.');

                const pages: string[] = [];
                notes.reduce((prev, curr, i, { length }) => {
                    const page =
                        `**User:** ${parseUser(curr.user_id)}\n` +
                        `**Content:** ${curr.content}\n` +
                        `**Moderator:** ${parseUser(curr.mod_id)}\n` +
                        `**Created At:** ${formatTimeDate(new Date(curr.timestamp))}\n` +
                        `**ID:** ${curr.id}` +
                        (curr.edited_timestamp ? `\n*(last edited by ${parseUser(curr.edited_mod_id)} at ${formatTimeDate(new Date(curr.edited_timestamp))})*` : '');

                    if ((i + 1) % 3 === 0 || i === length - 1) {
                        pages.push(prev + '\n\n' + page);
                        return '';
                    }

                    return prev + '\n\n' + page;
                }, '');

                const embed = await channel.send(
                    new MessageEmbed()
                        .setAuthor(notes.length > 1 ? 'Notes' : 'Note', embedIcon.note)
                        .setColor('#ffc107')
                        .setDescription(pages[0])
                );

                embedPages(embed, author, pages);
            }
        } catch (error) {
            if (error) sendError(channel, error);
        }
    },
};
