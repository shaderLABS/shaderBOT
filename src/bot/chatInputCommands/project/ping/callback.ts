import { ChatInputCommandCallback } from '../../../chatInputCommandHandler.js';
import { replyError, replySuccess } from '../../../lib/embeds.js';
import { Project } from '../../../lib/project.js';

export const command: ChatInputCommandCallback = {
    callback: async (interaction) => {
        try {
            const project = await Project.getByChannelID(interaction.channelId);
            project.assertOwner(interaction.user.id).assertNotArchived();

            await interaction.channel.send('<@&' + project.roleID + '>');
            replySuccess(interaction, 'All users that are subscribed to this project have been pinged.', 'Project Ping', true);
        } catch (error) {
            replyError(interaction, String(error));
        }
    },
};
