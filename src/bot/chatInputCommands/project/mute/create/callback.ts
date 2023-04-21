import { PermissionFlagsBits } from 'discord.js';
import { ChatInputCommandCallback } from '../../../../chatInputCommandHandler.js';
import { replyError, replySuccess } from '../../../../lib/embeds.js';
import { Project, ProjectMute } from '../../../../lib/project.js';

export const command: ChatInputCommandCallback = {
    callback: async (interaction) => {
        const targetUser = interaction.options.getUser('user', true);

        try {
            const project = await Project.getByChannelID(interaction.channelId);
            if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) project.assertOwner(interaction.user.id);

            const logString = await ProjectMute.create(project, targetUser, interaction.user.id);
            replySuccess(interaction, logString, 'Project Create Mute');
        } catch (error) {
            replyError(interaction, String(error));
        }
    },
};
