import { Command, syntaxError } from '../../commandHandler.js';
import { sendError } from '../../lib/embeds.js';
import { MessageEmbed } from 'discord.js';
import uuid from 'uuid-random';
import { editNote } from '../../lib/editNote.js';

const expectedArgs = '<uuid> <content>';

export const command: Command = {
    commands: ['edit'],
    superCommands: ['note'],
    help: 'Edit a specified note.',
    minArgs: 2,
    maxArgs: null,
    expectedArgs,
    requiredPermissions: ['KICK_MEMBERS'],
    callback: async (message, args, text) => {
        const { channel, author } = message;
        if (!uuid.test(args[0])) return syntaxError(channel, expectedArgs);

        try {
            const content = text.slice(args[0].length).trim();
            if (content.length < 1 || content.length > 500) return sendError(channel, 'The content must be between 1 and 500 characters long.');

            const { user_id } = await editNote(args[0], content, author.id);

            channel.send(
                new MessageEmbed()
                    .setAuthor('Edited Note', 'https://img.icons8.com/color/48/000000/note.png')
                    .setColor('#ffc107')
                    .setDescription(`Successfully edited the content of <@${user_id}>'s note.`)
                    .setFooter('ID: ' + args[0])
            );
        } catch (error) {
            sendError(channel, error);
        }
    },
};
