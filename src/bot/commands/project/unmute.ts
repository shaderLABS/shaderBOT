import { db } from '../../../db/postgres.js';
import { settings } from '../../bot.js';
import { Command } from '../../commandHandler.js';
import { sendError, sendSuccess } from '../../lib/embeds.js';
import log from '../../lib/log.js';
import { parseUser } from '../../lib/misc.js';
import { getUser } from '../../lib/searchMessage.js';

export const command: Command = {
    commands: ['unmute'],
    superCommands: ['project'],
    help: 'Unmute a user in your project channel.',
    expectedArgs: '<@user|userID|username>',
    minArgs: 1,
    maxArgs: null,
    requiredPermissions: ['MANAGE_WEBHOOKS'],
    permissionOverwrites: true,
    callback: async (message, _, text) => {
        const { channel, author } = message;
        if (channel.parentID && settings.archiveCategoryIDs.includes(channel.parentID)) return sendError(channel, 'This project is archived.');

        const project = (await db.query(/*sql*/ `SELECT 1 FROM project WHERE channel_id = $1 AND $2 = ANY (owners) LIMIT 1;`, [channel.id, author.id])).rows[0];
        if (!project) return sendError(channel, 'You do not have permission to run this command.');

        const targetUser = await getUser(text);
        if (!targetUser) return sendError(channel, 'The specified user argument is not resolvable.');

        const currentOverwrite = channel.permissionOverwrites.get(targetUser.id);
        if (!currentOverwrite || !currentOverwrite.deny.has('SEND_MESSAGES') || !currentOverwrite.deny.has('ADD_REACTIONS')) return sendError(channel, 'The specified user is not muted.');

        if (currentOverwrite.allow.equals(0) && currentOverwrite.deny.equals(['SEND_MESSAGES', 'ADD_REACTIONS'])) currentOverwrite.delete();
        else currentOverwrite.update({ SEND_MESSAGES: null, ADD_REACTIONS: null });

        log(`${parseUser(author)} unmuted ${parseUser(targetUser)} in their project (<#${channel.id}>).`);
        sendSuccess(channel, `Successfully unmuted ${parseUser(targetUser)} in this project.`);
    },
};
