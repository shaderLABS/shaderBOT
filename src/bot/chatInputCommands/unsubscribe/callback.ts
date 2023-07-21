import { ChannelType } from 'discord.js';
import { ChatInputCommandCallback } from '../../chatInputCommandHandler.js';
import { replyError, replySuccess } from '../../lib/embeds.js';
import { Project } from '../../lib/project.js';

export const command: ChatInputCommandCallback = {
    callback: async (interaction) => {
        const projectChannel = interaction.options.getChannel('project', false, Project.CHANNEL_TYPES) || interaction.channel;
        if (projectChannel.type !== ChannelType.GuildText) {
            replyError(interaction, 'This command is only usable in text channels.', 'Invalid Channel');
            return;
        }

        try {
            const project = await Project.getByChannelID(projectChannel.id);
            const logString = await project.removeSubscriber(interaction.member);
            replySuccess(interaction, logString, undefined, true);
        } catch (error) {
            replyError(interaction, String(error));
        }
    },
};
