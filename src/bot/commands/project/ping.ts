import { Message } from 'discord.js';
import { db } from '../../../db/postgres.js';
import { Command } from '../../commandHandler.js';

export const command: Command = {
    commands: ['ping'],
    superCommands: ['project'],
    help: 'Ping all users that are subscribed to the project of this channel.',
    minArgs: 0,
    maxArgs: 0,
    requiredPermissions: ['MANAGE_ROLES', 'MANAGE_WEBHOOKS'],
    permissionOverwrites: true,
    cooldownDuration: 15000,
    callback: async (message: Message) => {
        const { channel } = message;

        const project = (await db.query(/*sql*/ `SELECT role_id FROM project WHERE channel_id = $1 AND $2 = ANY (owners) LIMIT 1`, [channel.id, message.author.id])).rows[0];
        if (project && project.role_id) channel.send('<@&' + project.role_id + '>');
    },
};
