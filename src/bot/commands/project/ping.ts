import { Command } from '../../commandHandler.js';
import { Message } from 'discord.js';
import { db } from '../../../db/postgres.js';

export const command: Command = {
    commands: ['ping'],
    help: 'Ping all users that are subscribed to the project of this channel.',
    minArgs: 0,
    maxArgs: 0,
    superCommands: ['project'],
    requiredPermissions: ['MANAGE_CHANNELS'],
    permissionOverwrites: true,
    callback: async (message: Message) => {
        const { channel } = message;

        const project = (await db.query(/*sql*/ `SELECT role_id FROM project WHERE channel_id = $1 AND $2 = ANY (owners) LIMIT 1`, [channel.id, message.author.id])).rows[0];
        if (project && project.role_id) channel.send('<@&' + project.role_id + '>');
    },
};
