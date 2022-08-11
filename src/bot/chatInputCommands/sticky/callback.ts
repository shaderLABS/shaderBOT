import { ChatInputCommandCallback } from '../../chatInputCommandHandler.js';
import { replyError, replyInfo } from '../../lib/embeds.js';
import { StickyThread } from '../../lib/stickyThread.js';

export const command: ChatInputCommandCallback = {
    callback: async (interaction) => {
        const thread = interaction.options.getChannel('thread', false) || interaction.channel;
        if (!thread.isThread()) return replyError(interaction, 'This command is only usable in thread channels.', 'Invalid Channel');

        const isSticky = await StickyThread.isSticky(thread.id);
        replyInfo(interaction, `${thread.toString()} is ${isSticky ? 'sticky' : 'not sticky'}.`, 'Sticky Thread', undefined, undefined, true);
    },
};
