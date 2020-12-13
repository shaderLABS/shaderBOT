import { Command } from '../../commandHandler.js';
import { sendError } from '../../lib/embeds.js';
import { MessageEmbed } from 'discord.js';
import uuid from 'uuid-random';
import { editNote } from '../../lib/edit/editNote.js';
import { getUser } from '../../lib/searchMessage.js';
import { db } from '../../../db/postgres.js';

const expectedArgs = '<uuid|<@user|userID|username>> <content>';

export const command: Command = {
    commands: ['note', 'n'],
    superCommands: ['edit'],
    help: 'Edit a note.',
    minArgs: 2,
    maxArgs: null,
    expectedArgs,
    requiredPermissions: ['KICK_MEMBERS'],
    callback: async (message, args, text) => {
        const { channel, author } = message;

        const content = text.slice(args[0].length).trim();
        if (content.length < 1 || content.length > 500) return sendError(channel, 'The content must be between 1 and 500 characters long.');

        try {
            if (uuid.test(args[0])) {
                const { user_id } = await editNote(args[0], content, author.id);

                channel.send(
                    new MessageEmbed()
                        .setAuthor('Edited Note', 'https://img.icons8.com/color/48/000000/note.png')
                        .setColor('#ffc107')
                        .setDescription(`Successfully edited the content of <@${user_id}>'s note.`)
                        .setFooter('ID: ' + args[0])
                );
            } else {
                const user = await getUser(message, args[0]);

                const latestNoteID = (await db.query(/*sql*/ `SELECT id FROM note WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 1`, [user.id])).rows[0];
                if (!latestNoteID) return sendError(channel, 'The specified user does not have any notes.');

                await editNote(latestNoteID.id, content, author.id);

                channel.send(
                    new MessageEmbed()
                        .setAuthor('Edited Note', 'https://img.icons8.com/color/48/000000/note.png')
                        .setColor('#ffc107')
                        .setDescription(`Successfully edited the content of <@${user.id}>'s note.`)
                        .setFooter('ID: ' + latestNoteID.id)
                );
            }
        } catch (error) {
            sendError(channel, error);
        }
    },
};
