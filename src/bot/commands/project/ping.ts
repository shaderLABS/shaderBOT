import { db } from '../../../db/postgres.js';
import { settings } from '../../bot.js';
import { Command } from '../../commandHandler.js';
import { sendError } from '../../lib/embeds.js';

export const command: Command = {
    commands: ['ping'],
    superCommands: ['project'],
    help: 'Ping all users that are subscribed to the project of this channel.',
    minArgs: 0,
    maxArgs: 0,
    requiredPermissions: ['MANAGE_WEBHOOKS'],
    permissionOverwrites: true,
    cooldownDuration: 15000,
    callback: async (message) => {
        const { channel } = message;
        if (channel.parentID && settings.archiveCategoryIDs.includes(channel.parentID)) return sendError(channel, 'This project is archived.');

        const project = (await db.query(/*sql*/ `SELECT role_id FROM project WHERE channel_id = $1 AND $2 = ANY (owners) LIMIT 1`, [channel.id, message.author.id])).rows[0];
        if (project?.role_id) channel.send('<@&' + project.role_id + '>');
        else sendError(channel, 'You do not have permission to run this command.');
    },
};
