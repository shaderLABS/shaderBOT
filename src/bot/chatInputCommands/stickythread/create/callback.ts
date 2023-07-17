import { PermissionFlagsBits } from 'discord.js';
import { ChatInputCommandCallback } from '../../../chatInputCommandHandler.js';
import { replyError, replySuccess } from '../../../lib/embeds.js';
import { StickyThread } from '../../../lib/stickyThread.js';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.KickMembers,
    callback: async (interaction) => {
        const thread = interaction.options.getChannel('thread', false) || interaction.channel;
        if (!thread.isThread()) {
            replyError(interaction, 'This command is only usable in thread channels.', 'Invalid Channel');
            return;
        }

        try {
            const logString = await StickyThread.create(thread, interaction.user.id);
            replySuccess(interaction, logString, 'Create Sticky Thread');
        } catch (error) {
            replyError(interaction, String(error));
        }
    },
};
