import { replyError, replyInfo } from '../../lib/embeds.js';
import { StickyThread } from '../../lib/stickyThread.js';
import { ApplicationCommandCallback, GuildCommandInteraction } from '../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    callback: async (interaction: GuildCommandInteraction) => {
        const thread = interaction.options.getChannel('thread', false) || interaction.channel;
        if (!thread.isThread()) return replyError(interaction, 'This command is only usable in thread channels.', 'Invalid Channel');

        const isSticky = await StickyThread.isSticky(thread.id);
        replyInfo(interaction, `${thread.toString()} is ${isSticky ? 'sticky' : 'not sticky'}.`, 'Sticky Thread', undefined, undefined, true);
    },
};
