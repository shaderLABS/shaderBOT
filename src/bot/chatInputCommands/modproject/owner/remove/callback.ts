import { PermissionFlagsBits } from 'discord.js';
import { ChatInputCommandCallback } from '../../../../chatInputCommandHandler.js';
import { replyError, replySuccess } from '../../../../lib/embeds.js';
import { Project } from '../../../../lib/project.js';

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
