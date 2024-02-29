import { PermissionFlagsBits } from 'discord.js';
import type { ChatInputCommandCallback } from '../../../../chatInputCommandHandler.ts';
import { replyError, replySuccess } from '../../../../lib/embeds.ts';
import { Project } from '../../../../lib/project.ts';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.ManageChannels,
    callback: async (interaction) => {
        const targetUser = interaction.options.getUser('user', true);

        try {
            const project = await Project.getByChannelID(interaction.channelId);
            const logString = await project.removeOwner(targetUser, interaction.user.id);
            replySuccess(interaction, logString, 'Remove Project Owner');
        } catch (error) {
            replyError(interaction, String(error));
        }
    },
};
