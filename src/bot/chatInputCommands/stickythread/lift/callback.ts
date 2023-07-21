import { PermissionFlagsBits } from 'discord.js';
import { ChatInputCommandCallback } from '../../../chatInputCommandHandler.js';
import { replyError, replySuccess } from '../../../lib/embeds.js';
import { StickyThread } from '../../../lib/stickyThread.js';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.KickMembers,
    callback: async (interaction) => {
        const thread = interaction.options.getChannel('thread', false, StickyThread.CHANNEL_TYPES) || interaction.channel;
        if (!thread.isThread()) {
            replyError(interaction, 'This command is only usable in thread channels.', 'Invalid Channel');
            return;
        }

        try {
            const stickyThread = await StickyThread.getByThreadID(thread.id);
            const logString = await stickyThread.lift(interaction.user.id);
            replySuccess(interaction, logString, 'Lift Sticky Thread');
        } catch (error) {
            replyError(interaction, String(error));
        }
    },
};
