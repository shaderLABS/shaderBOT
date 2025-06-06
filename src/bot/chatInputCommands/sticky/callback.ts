import type { ChatInputCommandCallback } from '../../chatInputCommandHandler.ts';
import { replyError, replyInfo } from '../../lib/embeds.ts';
import { StickyThread } from '../../lib/stickyThread.ts';

export const command: ChatInputCommandCallback = {
    callback: async (interaction) => {
        const thread = interaction.options.getChannel('thread', false, StickyThread.CHANNEL_TYPES) || interaction.channel;
        if (!thread.isThread()) {
            replyError(interaction, {
                description: 'This command is only usable in thread channels.',
                title: 'Invalid Channel',
            });
            return;
        }

        const isSticky = await StickyThread.isSticky(thread.id);
        replyInfo(
            interaction,
            {
                description: `${thread.toString()} is ${isSticky ? 'sticky' : 'not sticky'}.`,
                title: 'Sticky Thread',
            },
            true,
        );
    },
};
