import { ChannelType, PermissionFlagsBits } from 'discord.js';
import { ChatInputCommandCallback } from '../../../chatInputCommandHandler.js';
import { ChannelLock } from '../../../lib/channelRestriction/lock.js';
import { replyError, replySuccess } from '../../../lib/embeds.js';
import { splitString, stringToSeconds } from '../../../lib/time.js';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.KickMembers,
    callback: async (interaction) => {
        const channel = interaction.options.getChannel('channel', false, ChannelLock.CHANNEL_TYPES) || interaction.channel;
        if (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildVoice) {
            replyError(interaction, 'This command is only usable in text or voice channels.', 'Invalid Channel');
            return;
        }

        const durationString = interaction.options.getString('duration', true);

        try {
            var duration = stringToSeconds(splitString(durationString));
        } catch (error) {
            replyError(interaction, String(error));
            return;
        }

        try {
            const logString = await ChannelLock.create(interaction.user.id, channel, duration);
            replySuccess(interaction, logString, 'Create Lock');
        } catch (error) {
            replyError(interaction, String(error));
        }
    },
};
