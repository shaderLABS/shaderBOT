import { MessageEmbed } from 'discord.js';
import uuid from 'uuid-random';
import { db } from '../../../db/postgres.js';
import { Command, syntaxError } from '../../commandHandler.js';
import { embedIcon, sendError } from '../../lib/embeds.js';
import log from '../../lib/log.js';
import { parseUser } from '../../lib/misc.js';
import { formatTimeDate } from '../../lib/time.js';

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

        const messageContent = [
            `**User:** ${parseUser(result.user_id)}\n**Content:** ${result.content}\n**Moderator:** ${parseUser(result.mod_id)}\n**Created At:** ${formatTimeDate(new Date(result.timestamp))}`,
            result.edited_timestamp ? `\n*(last edited by ${parseUser(result.edited_mod_id)} at ${formatTimeDate(new Date(result.edited_timestamp))})*` : '',
        ];

        channel.send({
            embeds: [
                new MessageEmbed()
                    .setAuthor('Delete Note', embedIcon.note)
                    .setColor('#ffc107')
                    .setDescription(messageContent.join(''))
                    .setFooter('ID: ' + args[0]),
            ],
        });

        log(messageContent.join(`\n**ID:** ${args[0]}`), 'Delete Note');
    },
};
