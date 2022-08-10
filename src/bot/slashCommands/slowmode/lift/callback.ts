import { ChannelType, PermissionFlagsBits } from 'discord.js';
import { replyError, replySuccess } from '../../../lib/embeds.js';
import { LockSlowmode } from '../../../lib/lockSlowmode.js';
import { ApplicationCommandCallback, GuildCommandInteraction } from '../../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: PermissionFlagsBits.KickMembers,
    callback: async (interaction: GuildCommandInteraction) => {
        const channel = interaction.options.getChannel('channel', false) || interaction.channel;
        if (channel.type !== ChannelType.GuildText && !channel.isThread()) return replyError(interaction, 'This command is only usable in text and thread channels.', 'Invalid Channel');

        try {
            const slowmode = await LockSlowmode.getByChannelID(channel.id, 'slowmode');
            const logString = await slowmode.lift(interaction.user.id);
            replySuccess(interaction, logString, 'Lift Slowmode');
        } catch (error) {
            replyError(interaction, error);
        }
    },
};
