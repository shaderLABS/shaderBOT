import { Command } from '../../commandHandler.js';
import Project from '../../../db/models/Project.js';
import { Message } from 'discord.js';

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

        const project = await Project.findOne({ channel: channel.id });
        if (!project || !project.owners) return;
        if (!project.owners.includes(message.author.id)) return;

        channel.send('<@&' + project.pingRole + '>');
    },
};
