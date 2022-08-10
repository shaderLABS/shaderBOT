import { PermissionFlagsBits } from 'discord.js';
import { ChatInputCommandCallback, GuildCommandInteraction } from '../../../chatInputCommandHandler.js';
import { replyError, replySuccess } from '../../../lib/embeds.js';
import { StickyThread } from '../../../lib/stickyThread.js';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.KickMembers,
    callback: async (interaction: GuildCommandInteraction) => {
        const thread = interaction.options.getChannel('thread', false) || interaction.channel;
        if (!thread.isThread()) return replyError(interaction, 'This command is only usable in thread channels.', 'Invalid Channel');

        try {
            const stickyThread = await StickyThread.getByThreadID(thread.id);
            const logString = await stickyThread.lift(interaction.user.id);
            replySuccess(interaction, logString, 'Lift Sticky Thread');
        } catch (error) {
            replyError(interaction, error);
        }
    },
};
