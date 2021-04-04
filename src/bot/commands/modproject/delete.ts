import { db } from '../../../db/postgres.js';
import { Command } from '../../commandHandler.js';
import { sendError, sendSuccess } from '../../lib/embeds.js';
import log from '../../lib/log.js';

export const command: Command = {
    commands: ['delete'],
    superCommands: ['modproject', 'mproject'],
    help: 'Delete the project linked to the current channel.',
    minArgs: 0,
    maxArgs: 0,
    requiredPermissions: ['MANAGE_CHANNELS'],
    callback: async (message) => {
        const { channel } = message;

        const deleted = await db.query(/*sql*/ `DELETE FROM project WHERE channel_id = $1 RETURNING owners::TEXT[], role_id`, [channel.id]);
        if (deleted.rowCount === 0) return sendError(channel, 'No project has been set up for this channel.');

        channel.overwritePermissions(channel.permissionOverwrites.filter((overwrite) => overwrite.type !== 'member' || !deleted.rows[0].owners.includes(overwrite.id)));

        if (deleted.rows[0].role_id) {
            const role = await channel.guild.roles.fetch(deleted.rows[0].role_id);
            if (role) role.delete();
        }

        sendSuccess(channel, 'Deleted the project and role linked to this channel.');
        log(`<@${message.author.id}> deleted the project and role linked to <#${channel.id}>.`);
    },
};
