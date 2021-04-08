import { db } from '../../../db/postgres.js';
import { settings } from '../../bot.js';
import { Command } from '../../commandHandler.js';
import { sendError, sendSuccess } from '../../lib/embeds.js';
import log from '../../lib/log.js';
import { parseUser } from '../../lib/misc.js';

export const command: Command = {
    commands: ['description'],
    superCommands: ['project'],
    help: 'Change the description of your project channel.',
    expectedArgs: '<description>',
    minArgs: 0,
    maxArgs: null,
    requiredPermissions: ['MANAGE_WEBHOOKS'],
    permissionOverwrites: true,
    cooldownDuration: 20000,
    callback: async (message, _, text) => {
        const { channel, author } = message;
        if (channel.parentID && settings.archiveCategoryIDs.includes(channel.parentID)) return sendError(channel, 'This project is archived.');

        const project = (await db.query(/*sql*/ `SELECT 1 FROM project WHERE channel_id = $1 AND $2 = ANY (owners) LIMIT 1`, [channel.id, author.id])).rows[0];
        if (!project) return sendError(channel, 'You do not have permission to run this command.');

        if (text.length > 1024) return sendError(channel, 'Channel descriptions must be less than 32 characters long.');

        log(`${parseUser(author)} edited the description of their project (<#${channel.id}>) from:\n\n${channel.topic || 'No description.'}\n\nto:\n\n${text || 'No description.'}`);
        channel.edit({ topic: text });
        sendSuccess(channel, 'Successfully edited the description of this channel.');
    },
};
