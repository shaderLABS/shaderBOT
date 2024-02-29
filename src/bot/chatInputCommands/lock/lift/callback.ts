import { ChannelType, PermissionFlagsBits } from 'discord.js';
import type { ChatInputCommandCallback } from '../../../chatInputCommandHandler.ts';
import { ChannelLock } from '../../../lib/channelRestriction/lock.ts';
import { replyError, replySuccess } from '../../../lib/embeds.ts';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.KickMembers,
    callback: async (interaction) => {
        const channel = interaction.options.getChannel('channel', false, ChannelLock.CHANNEL_TYPES) || interaction.channel;
        if (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildVoice) {
            replyError(interaction, 'This command is only usable in text or voice channels.', 'Invalid Channel');
            return;
        }

        try {
            const lock = await ChannelLock.getByChannelID(channel.id);
            const logString = await lock.lift(interaction.user.id);
            replySuccess(interaction, logString, 'Lift Lock');
        } catch (error) {
            replyError(interaction, String(error));
        }
    },
};
