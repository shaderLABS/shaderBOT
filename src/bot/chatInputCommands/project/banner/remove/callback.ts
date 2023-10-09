import { ChatInputCommandCallback } from '../../../../chatInputCommandHandler.js';
import { replyError, replySuccess } from '../../../../lib/embeds.js';
import { Project } from '../../../../lib/project.js';

export const command: ChatInputCommandCallback = {
    callback: async (interaction) => {
        try {
            const project = await Project.getByChannelID(interaction.channelId);
            project.assertOwner(interaction.user.id).assertNotArchived();

            const logString = await project.removeBannerMessageID(interaction.user.id);
            replySuccess(interaction, logString, 'Remove Project Banner');
        } catch (error) {
            replyError(interaction, String(error));
        }
    },
};
