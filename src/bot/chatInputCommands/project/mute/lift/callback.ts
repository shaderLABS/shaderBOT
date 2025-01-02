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

            const projectMute = await ProjectMute.getByUserIDAndProjectID(targetUser.id, project.id);
            const logString = await projectMute.lift(interaction.user.id);
            replySuccess(interaction, { description: logString, title: 'Project Lift Mute' });
        } catch (error) {
            replyError(interaction, { description: String(error) });
        }
    },
};
