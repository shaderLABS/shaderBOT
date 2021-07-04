import { db } from '../../db/postgres.js';
import { settings } from '../bot.js';
import { Command, syntaxError } from '../commandHandler.js';
import { sendError, sendSuccess } from '../lib/embeds.js';

const expectedArgs = '<#project>';

export const command: Command = {
    commands: ['subscribe'],
    help: 'Subscribe to notifications of a project.',
    minArgs: 1,
    maxArgs: 1,
    expectedArgs,
    channelWhitelist: [settings.botChannelID],
    callback: async (message) => {
        const { guild, channel, member } = message;
        const projectChannel = message.mentions.channels.first();
        if (!projectChannel) return syntaxError(channel, 'subscribe ' + expectedArgs);

        const project = (await db.query(/*sql*/ `SELECT role_id FROM project WHERE channel_id = $1 LIMIT 1;`, [projectChannel.id])).rows[0];
        if (!project) return sendError(channel, `<#${projectChannel.id}> is not a project channel.`);

        const role = await guild.roles.fetch(project.role_id);
        if (!role) return sendError(channel, "Failed to resolve the project's role.");

        if (!member.roles.cache.has(role.id)) {
            member.roles.add(role);
            return sendSuccess(channel, `You will now receive notifications from <#${projectChannel.id}>.`);
        }

        return sendError(channel, `You already receive notifications from <#${projectChannel.id}>.\nYou can unsubscribe from notifications using \`${settings.prefix}unsubscribe\`.`);
    },
};
