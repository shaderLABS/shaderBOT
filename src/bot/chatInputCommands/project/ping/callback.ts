import type { ChatInputCommandCallback } from '../../../chatInputCommandHandler.ts';
import { replyError, replySuccess } from '../../../lib/embeds.ts';
import { Project } from '../../../lib/project.ts';

export const command: ChatInputCommandCallback = {
    callback: async (interaction) => {
        try {
            const project = await Project.getByChannelID(interaction.channelId);
            project.assertOwner(interaction.user.id).assertNotArchived();

            await interaction.channel.send('<@&' + project.roleId + '>');
            replySuccess(interaction, { description: 'All users that are subscribed to this project have been pinged.', title: 'Project Ping' }, true);
        } catch (error) {
            replyError(interaction, { description: String(error) });
        }
    },
};
