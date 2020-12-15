import { MessageEmbed } from 'discord.js';
import uuid from 'uuid-random';
import { db } from '../../../db/postgres.js';
import { Command } from '../../commandHandler.js';
import { embedPages, sendError } from '../../lib/embeds.js';
import { getUser } from '../../lib/searchMessage.js';

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

                channel.send(
                    new MessageEmbed()
                        .setAuthor('Note', 'https://img.icons8.com/color/48/000000/note.png')
                        .setColor('#ffc107')
                        .setDescription(
                            `**User:** <@${note.user_id}>\n**Moderator:** <@${note.mod_id}>\n**Content:** ${note.content}\n**Created At:** ${new Date(
                                note.timestamp
                            ).toLocaleString()}${
                                note.edited_timestamp ? `\n*(last edited by <@${note.edited_mod_id}> at ${new Date(note.edited_timestamp).toLocaleString()})*` : ''
                            }`
                        )
                        .setFooter('ID: ' + args[0])
                );
            } else {
                // <@user|userID|username>

                const user = await getUser(text, message.mentions);

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
                    const page = `**User:** <@${curr.user_id}>\n**Content:** ${curr.content}\n**Moderator:** <@${curr.mod_id}>\n**ID:** ${curr.id}\n**Created At:** ${new Date(
                        curr.timestamp
                    ).toLocaleString()}${curr.edited_timestamp ? `\n*(last edited by <@${curr.edited_mod_id}> at ${new Date(curr.edited_timestamp).toLocaleString()})*` : ''}`;

                    if ((i + 1) % 3 === 0 || i === length - 1) {
                        pages.push(prev + '\n\n' + page);
                        return '';
                    }

                    return prev + '\n\n' + page;
                }, '');

                const embed = await channel.send(
                    new MessageEmbed()
                        .setAuthor(notes.length > 1 ? 'Notes' : 'Note', 'https://img.icons8.com/color/48/000000/note.png')
                        .setColor('#ffc107')
                        .setDescription(pages[0])
                );

                embedPages(embed, author, pages);
            }
        } catch (error) {
            sendError(channel, error);
        }
    },
};
