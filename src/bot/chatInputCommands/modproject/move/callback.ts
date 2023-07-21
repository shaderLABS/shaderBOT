import { PermissionFlagsBits } from 'discord.js';
import { ChatInputCommandCallback } from '../../../chatInputCommandHandler.js';
import { replyError, replySuccess } from '../../../lib/embeds.js';
import { Project } from '../../../lib/project.js';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.ManageChannels,
    callback: async (interaction) => {
        const categoryChannel = interaction.options.getChannel('category', true, Project.CATEGORY_CHANNEL_TYPES);

        try {
            const project = await Project.getByChannelID(interaction.channel.id);
            const logString = await project.move(categoryChannel, interaction.user.id);
            replySuccess(interaction, logString, 'Move Project');
        } catch (error) {
            replyError(interaction, String(error));
        }
    },
};
