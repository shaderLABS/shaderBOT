import { db } from '../../../db/postgres.js';
import { Command } from '../../commandHandler.js';
import { sendError, sendSuccess } from '../../lib/embeds.js';
import log from '../../lib/log.js';

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

        const project = (await db.query(/*sql*/ `SELECT 1 FROM project WHERE channel_id = $1 AND $2 = ANY (owners) LIMIT 1`, [channel.id, author.id])).rows[0];
        if (!project) return sendError(channel, 'You do not have permission to run this command.');

        if (text.length < 2 || text.length > 32) return sendError(channel, 'Channel names must be between 2 and 32 characters long.');

        const oldName = channel.name;

        try {
            await channel.edit({ name: text });

            const textChannels = channel.parent?.children
                ?.filter((channel) => channel.type === 'text')
                .sort((a, b) => a.name.replace(/[^\x00-\x7F]/g, '').localeCompare(b.name.replace(/[^\x00-\x7F]/g, ''), 'en'));

            if (textChannels) {
                const position = textChannels.keyArray().indexOf(channel.id);
                if (position) {
                    await channel.edit({ position });
                }
            }
        } catch {
            return sendError(channel, 'Failed to edit the name of this channel.');
        }

        log(`<@${author.id}> edited the name of their project (<#${channel.id}>) from:\n\n${oldName}\n\nto:\n\n${channel.name}`);
        sendSuccess(channel, 'Successfully edited the name of this channel.');
    },
};
