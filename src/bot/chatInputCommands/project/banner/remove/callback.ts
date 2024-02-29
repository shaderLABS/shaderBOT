import type { ChatInputCommandCallback } from '../../../../chatInputCommandHandler.ts';
import { replyError, replySuccess } from '../../../../lib/embeds.ts';
import { Project } from '../../../../lib/project.ts';

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
