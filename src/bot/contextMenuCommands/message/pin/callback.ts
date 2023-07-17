import { MessageContextMenuCommandCallback } from '../../../contextMenuCommandHandler.js';
import { replyError, replySuccess } from '../../../lib/embeds.js';
import { Project } from '../../../lib/project.js';

export const command: MessageContextMenuCommandCallback = {
    commandName: 'Pin/Unpin',
    callback: async (interaction) => {
        try {
            const project = await Project.getByChannelID(interaction.channelId);
            project.assertOwner(interaction.user.id).assertNotArchived();
        } catch (error) {
            replyError(interaction, String(error));
            return;
        }

        const { targetMessage } = interaction;
        const wasPinned = targetMessage.pinned;

        try {
            if (wasPinned) await targetMessage.unpin();
            else await targetMessage.pin();
        } catch {
            replyError(interaction, wasPinned ? 'Failed to unpin message.' : 'Failed to pin message. You can only pin up to 50 messages.');
            return;
        }

        replySuccess(interaction, undefined, `The message was ${wasPinned ? 'unpinned' : 'pinned'}.`, true);
    },
};
