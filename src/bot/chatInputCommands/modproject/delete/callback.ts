import { PermissionFlagsBits } from 'discord.js';
import { ChatInputCommandCallback } from '../../../chatInputCommandHandler.js';
import { replyError, replySuccess } from '../../../lib/embeds.js';
import { Project } from '../../../lib/project.js';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.ManageChannels,
    callback: async (interaction) => {
        try {
            const project = await Project.getByChannelID(interaction.channelId);
            const logString = await project.delete(interaction.user.id);
            replySuccess(interaction, logString, 'Delete Project');
        } catch (error) {
            replyError(interaction, String(error));
        }
    },
};
