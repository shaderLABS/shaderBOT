import { Command } from '../../commandHandler.js';
import Project from '../../../db/models/Project.js';
import { Message, TextChannel } from 'discord.js';
import log from '../../../misc/log.js';

export const command: Command = {
    commands: ['delete'],
    minArgs: 0,
    maxArgs: 0,
    superCommand: 'project',
    requiredPermissions: ['MANAGE_CHANNELS'],
    callback: async (message: Message) => {
        const { channel } = message;
        if (!(channel instanceof TextChannel)) return;

        const deleted = await Project.findOne({ channel: channel.id });
        if (!deleted) return channel.send('No project has been set up for this channel.');

        const role = await channel.guild.roles.fetch(deleted.pingRole);
        if (role) role.delete();

        await deleted.deleteOne();

        channel.send('Deleted the project and role linked to this channel.');
        log('Deleted the project and role linked to <#' + channel.id + '>.');
    },
};