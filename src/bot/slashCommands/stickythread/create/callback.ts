import { PermissionFlagsBits } from 'discord.js';
import { replyError, replySuccess } from '../../../lib/embeds.js';
import { StickyThread } from '../../../lib/stickyThread.js';
import { ApplicationCommandCallback, GuildCommandInteraction } from '../../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: PermissionFlagsBits.KickMembers,
    callback: async (interaction: GuildCommandInteraction) => {
        const thread = interaction.options.getChannel('thread', false) || interaction.channel;
        if (!thread.isThread()) return replyError(interaction, 'This command is only usable in thread channels.', 'Invalid Channel');

        try {
            const logString = await StickyThread.create(thread, interaction.user.id);
            replySuccess(interaction, logString, 'Create Sticky Thread');
        } catch (error) {
            replyError(interaction, error);
        }
    },
};
