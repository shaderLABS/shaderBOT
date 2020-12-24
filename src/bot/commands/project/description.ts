import { Message, TextChannel } from 'discord.js';
import { db } from '../../../db/postgres.js';
import { Command } from '../../commandHandler.js';
import { sendError, sendSuccess } from '../../lib/embeds.js';
import log from '../../lib/log.js';

export const command: Command = {
    commands: ['description'],
    superCommands: ['project'],
    help: 'Change the description of your project channel.',
    minArgs: 0,
    maxArgs: null,
    requiredPermissions: ['MANAGE_ROLES', 'MANAGE_WEBHOOKS'],
    permissionOverwrites: true,
    callback: async (message: Message, _, text: string) => {
        const { channel, author } = message;
        if (!(channel instanceof TextChannel)) return;

        const project = (await db.query(/*sql*/ `SELECT 1 FROM project WHERE channel_id = $1 AND $2 = ANY (owners) LIMIT 1`, [channel.id, author.id])).rows[0];
        if (!project) return sendError(channel, 'You do not have permission to run this command.');

        log(
            `<@${author.id}> edited the description of their project (<#${channel.id}>) from:\n\n${channel.topic || 'No description.'}\n\nto:\n\n${text || 'No description.'}`
        );
        channel.edit({ topic: text });
        sendSuccess(channel, 'Successfully edited the description of this channel.');
    },
};
