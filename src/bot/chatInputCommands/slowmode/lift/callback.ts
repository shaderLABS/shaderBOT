import { ChannelType, PermissionFlagsBits } from 'discord.js';
import { ChatInputCommandCallback } from '../../../chatInputCommandHandler.js';
import { ChannelSlowmode } from '../../../lib/channelRestriction/slowmode.js';
import { replyError, replySuccess } from '../../../lib/embeds.js';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.KickMembers,
    callback: async (interaction) => {
        const channel = interaction.options.getChannel('channel', false, ChannelSlowmode.CHANNEL_TYPES) || interaction.channel;
        if (channel.type !== ChannelType.GuildText && !channel.isThread()) {
            replyError(interaction, 'This command is only usable in text or thread channels.', 'Invalid Channel');
            return;
        }

        try {
            const slowmode = await ChannelSlowmode.getByChannelID(channel.id);
            const logString = await slowmode.lift(interaction.user.id);
            replySuccess(interaction, logString, 'Lift Slowmode');
        } catch (error) {
            replyError(interaction, String(error));
        }
    },
};
