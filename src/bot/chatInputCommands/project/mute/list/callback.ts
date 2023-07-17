import { PermissionFlagsBits } from 'discord.js';
import { ChatInputCommandCallback } from '../../../../chatInputCommandHandler.js';
import { replyButtonPages, replyError, replyInfo } from '../../../../lib/embeds.js';
import { Project, ProjectMute } from '../../../../lib/project.js';

export const command: ChatInputCommandCallback = {
    callback: async (interaction) => {
        try {
            const project = await Project.getByChannelID(interaction.channelId);
            if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) project.assertOwner(interaction.user.id);

            const projectMutes = await ProjectMute.getAllByProjectID(project.id);

            if (projectMutes.length === 0) {
                replyInfo(interaction, 'There are no mutes in the current project.', 'Project Mutes', undefined, undefined, true);
                return;
            }

            const pages: string[] = [];
            projectMutes.reduce((content, mute, index, { length }) => {
                const page = mute.toString();

                if ((index + 1) % 3 === 0 || index === length - 1) {
                    pages.push(content + '\n\n' + page);
                    return '';
                }

                return content + '\n\n' + page;
            }, '');

            replyButtonPages(interaction, pages, 'Project Mutes', undefined, undefined, true);
        } catch (error) {
            replyError(interaction, String(error));
        }
    },
};
