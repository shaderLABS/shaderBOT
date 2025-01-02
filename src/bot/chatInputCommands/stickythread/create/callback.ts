import { PermissionFlagsBits } from 'discord.js';
import type { ChatInputCommandCallback } from '../../../chatInputCommandHandler.ts';
import { replyError, replySuccess } from '../../../lib/embeds.ts';
import { StickyThread } from '../../../lib/stickyThread.ts';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.KickMembers,
    callback: async (interaction) => {
        const thread = interaction.options.getChannel('thread', false, StickyThread.CHANNEL_TYPES) || interaction.channel;
        if (!thread.isThread()) {
            replyError(interaction, {
                description: 'This command is only usable in thread channels.',
                title: 'Invalid Channel',
            });
            return;
        }

        try {
            const logString = await StickyThread.create(thread, interaction.user.id);
            replySuccess(interaction, { description: logString, title: 'Create Sticky Thread' });
        } catch (error) {
            replyError(interaction, { description: String(error) });
        }
    },
};
