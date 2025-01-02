import { ChannelType, PermissionFlagsBits } from 'discord.js';
import type { ChatInputCommandCallback } from '../../../chatInputCommandHandler.ts';
import { ChannelSlowmode } from '../../../lib/channelRestriction/slowmode.ts';
import { replyError, replySuccess } from '../../../lib/embeds.ts';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.KickMembers,
    callback: async (interaction) => {
        const channel = interaction.options.getChannel('channel', false, ChannelSlowmode.CHANNEL_TYPES) || interaction.channel;
        if (channel.type !== ChannelType.GuildText && !channel.isThread()) {
            replyError(interaction, { description: 'This command is only usable in text or thread channels.', title: 'Invalid Channel' });
            return;
        }

        try {
            const slowmode = await ChannelSlowmode.getByChannelID(channel.id);
            const logString = await slowmode.lift(interaction.user.id);
            replySuccess(interaction, { description: logString, title: 'Lift Slowmode' });
        } catch (error) {
            replyError(interaction, { description: String(error) });
        }
    },
};
