import { Command } from '../../commandHandler.js';
import Project from '../../../db/models/Project.js';
import { Message, TextChannel } from 'discord.js';
import log from '../../../misc/log.js';
import { sendError, sendSuccess } from '../../../misc/embeds.js';

export const command: Command = {
    commands: ['delete'],
    help: 'Delete the project linked to the current channel.',
    minArgs: 0,
    maxArgs: 0,
    superCommands: ['project'],
    requiredPermissions: ['MANAGE_CHANNELS'],
    callback: async (message: Message) => {
        const { channel } = message;
        if (!(channel instanceof TextChannel)) return;

        const deleted = await Project.findOne({ channel: channel.id });
        if (!deleted) return sendError(channel, 'No project has been set up for this channel.');

        channel.overwritePermissions(channel.permissionOverwrites.filter((overwrite) => overwrite.type !== 'member' || !deleted.owners?.includes(overwrite.id)));

        const role = await channel.guild.roles.fetch(deleted.pingRole);
        if (role) role.delete();

        await deleted.deleteOne();

        sendSuccess(channel, 'Deleted the project and role linked to this channel.');
        log(`<@${message.author.id}> deleted the project and role linked to <#${channel.id}>.`);
    },
};
