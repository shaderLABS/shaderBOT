import { db } from '../../../db/postgres.js';
import { settings } from '../../bot.js';
import { Command } from '../../commandHandler.js';
import { sendError, sendSuccess } from '../../lib/embeds.js';
import log from '../../lib/log.js';
import { ensureTextChannel, getAlphabeticalChannelPosition, parseUser } from '../../lib/misc.js';

export const command: Command = {
    commands: ['name'],
    superCommands: ['project'],
    help: 'Change the name of your project channel.',
    expectedArgs: '<name>',
    minArgs: 1,
    maxArgs: null,
    requiredPermissions: ['MANAGE_WEBHOOKS'],
    permissionOverwrites: true,
    cooldownDuration: 20000,
    callback: async (message, _, text) => {
        const { channel, author } = message;
        if (!ensureTextChannel(channel)) return;

        if (channel.parentId && settings.archiveCategoryIDs.includes(channel.parentId)) return sendError(channel, 'This project is archived.');

        const project = (await db.query(/*sql*/ `SELECT 1 FROM project WHERE channel_id = $1 AND $2 = ANY (owners) LIMIT 1`, [channel.id, author.id])).rows[0];
        if (!project) return sendError(channel, 'You do not have permission to run this command.');

        if (text.length < 2 || text.length > 32) return sendError(channel, 'Channel names must be between 2 and 32 characters long.');

        const oldName = channel.name;
        channel.name = text;

        try {
            await channel.edit({ name: text, position: getAlphabeticalChannelPosition(channel, channel.parent) });
        } catch {
            return sendError(channel, 'Failed to edit the name of this channel.');
        }

        log(`${parseUser(author)} edited the name of their project (<#${channel.id}>) from:\n\n${oldName}\n\nto:\n\n${channel.name}`);
        sendSuccess(channel, 'Successfully edited the name of this channel.');
    },
};
