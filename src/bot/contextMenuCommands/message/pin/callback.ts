import type { MessageContextMenuCommandCallback } from '../../../contextMenuCommandHandler.ts';
import { replyError, replySuccess } from '../../../lib/embeds.ts';
import { Project } from '../../../lib/project.ts';

export const command: MessageContextMenuCommandCallback = {
    commandName: 'Pin/Unpin',
    callback: async (interaction) => {
        try {
            let projectChannelId = interaction.channelId;

            if (interaction.channel?.isThread()) {
                projectChannelId = interaction.channel.parentId!;
            }

            const project = await Project.getByChannelID(projectChannelId);
            project.assertOwner(interaction.user.id).assertNotArchived();
        } catch (error) {
            replyError(interaction, { description: String(error) });
            return;
        }

        const { targetMessage } = interaction;
        const wasPinned = targetMessage.pinned;

        try {
            if (wasPinned) await targetMessage.unpin();
            else await targetMessage.pin();
        } catch {
            replyError(interaction, {
                description: wasPinned ? 'Failed to unpin message.' : 'Failed to pin message. You can only pin up to 50 messages.',
            });
            return;
        }

        replySuccess(interaction, { title: `The message was ${wasPinned ? 'unpinned' : 'pinned'}.` }, true);
    },
};
