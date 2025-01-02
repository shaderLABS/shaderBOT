import { PermissionFlagsBits } from 'discord.js';
import type { ChatInputCommandCallback } from '../../../chatInputCommandHandler.ts';
import { replyError, replySuccess } from '../../../lib/embeds.ts';
import { Project } from '../../../lib/project.ts';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.ManageChannels,
    callback: async (interaction) => {
        const categoryChannel = interaction.options.getChannel('category', true, Project.CATEGORY_CHANNEL_TYPES);

        try {
            const project = await Project.getByChannelID(interaction.channel.id);
            const logString = await project.move(categoryChannel, interaction.user.id);
            replySuccess(interaction, { description: logString, title: 'Move Project' });
        } catch (error) {
            replyError(interaction, { description: String(error) });
        }
    },
};
