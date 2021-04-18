import { db } from '../../../db/postgres.js';
import { settings } from '../../bot.js';
import { Command } from '../../commandHandler.js';
import { sendError, sendSuccess } from '../../lib/embeds.js';
import log from '../../lib/log.js';
import { parseUser } from '../../lib/misc.js';
import { getUser } from '../../lib/searchMessage.js';

export const command: Command = {
    commands: ['mute'],
    superCommands: ['project'],
    help: 'Mute a user in your project channel.',
    expectedArgs: '<@user|userID|username>',
    minArgs: 1,
    maxArgs: null,
    requiredPermissions: ['MANAGE_WEBHOOKS'],
    permissionOverwrites: true,
    callback: async (message, _, text) => {
        const { channel, author } = message;
        if (channel.parentID && settings.archiveCategoryIDs.includes(channel.parentID)) return sendError(channel, 'This project is archived.');

        const project = (await db.query(/*sql*/ `SELECT owners::TEXT[] FROM project WHERE channel_id = $1 AND $2 = ANY (owners) LIMIT 1;`, [channel.id, author.id])).rows[0];
        if (!project) return sendError(channel, 'You do not have permission to run this command.');
        if (!project.owners) return sendError(channel, 'Failed to query channel owners.');

        const targetUser = await getUser(text);
        if (!targetUser) return sendError(channel, 'The specified user argument is not resolvable.');

        if (project.owners.includes(targetUser.id)) return sendError(channel, 'You can not mute a channel owner.');

        channel.updateOverwrite(targetUser, { SEND_MESSAGES: false, ADD_REACTIONS: false });

        log(`${parseUser(author)} muted ${parseUser(targetUser)} in their project (<#${channel.id}>)`);
        sendSuccess(channel, `Successfully muted ${parseUser(targetUser)} in this project.`);
    },
};
