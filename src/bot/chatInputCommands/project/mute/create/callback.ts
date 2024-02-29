import { PermissionFlagsBits } from 'discord.js';
import type { ChatInputCommandCallback } from '../../../../chatInputCommandHandler.ts';
import { replyError, replySuccess } from '../../../../lib/embeds.ts';
import { Project, ProjectMute } from '../../../../lib/project.ts';

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
