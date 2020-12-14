import { MessageEmbed } from 'discord.js';
import uuid from 'uuid-random';
import { db } from '../../../db/postgres.js';
import { Command, syntaxError } from '../../commandHandler.js';
import { sendError } from '../../lib/embeds.js';
import log from '../../lib/log.js';

const expectedArgs = '<uuid>';

export const command: Command = {
    commands: ['delete'],
    superCommands: ['note'],
    help: 'Deletes a note.',
    minArgs: 1,
    maxArgs: 1,
    expectedArgs,
    requiredPermissions: ['KICK_MEMBERS'],
    callback: async (message, args) => {
        const { channel } = message;
        if (!uuid.test(args[0])) return syntaxError(channel, 'note delete ' + expectedArgs);

        const result = (
            await db.query(
                /*sql*/ `
                DELETE FROM note
                WHERE id = $1
                RETURNING user_id, mod_id, content, timestamp, edited_mod_id, edited_timestamp;`,
                [args[0]]
            )
        ).rows[0];
        if (!result) return sendError(channel, 'There is no note with this ID.');

        channel.send(
            new MessageEmbed()
                .setAuthor('Deleted Note', 'https://img.icons8.com/color/48/000000/note.png')
                .setColor('#ffc107')
                .setDescription(
                    `**User:** <@${result.user_id}>\n**Moderator:** <@${result.mod_id}>\n**Content:** ${result.content}\n**Created At:** ${new Date(
                        result.timestamp
                    ).toLocaleString()}${
                        result.edited_timestamp ? `\n*(last edited by <@${result.edited_mod_id}> at ${new Date(result.edited_timestamp).toLocaleString()})*` : ''
                    }`
                )
                .setFooter('ID: ' + args[0])
        );

        log(
            `**User:** <@${result.user_id}>\n**Content:** ${result.content}\n**Moderator:** <@${result.mod_id}>\n**Created At:** ${new Date(
                result.timestamp
            ).toLocaleString()}\n**ID:** ${args[0]}`,
            'Deleted Note'
        );
    },
};
