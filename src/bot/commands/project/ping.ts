import { Command } from '../../commandHandler.js';
import Project from '../../../db/models/Project.js';
import { Message } from 'discord.js';

export const command: Command = {
    commands: ['ping'],
    minArgs: 0,
    maxArgs: 0,
    superCommand: 'project',
    requiredPermissions: ['MANAGE_CHANNELS'],
    callback: async (message: Message) => {
        const { channel } = message;

        const project = await Project.findOne({ channel: channel.id });
        if (!project || !project.owners) return;
        if (!project.owners.includes(message.author.id)) return;

        channel.send('<@&' + project.pingRole + '>');
    },
};
