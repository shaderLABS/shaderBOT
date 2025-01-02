import { ChannelType, PermissionFlagsBits } from 'discord.js';
import type { ChatInputCommandCallback } from '../../../chatInputCommandHandler.ts';
import { ChannelLock } from '../../../lib/channelRestriction/lock.ts';
import { replyError, replySuccess } from '../../../lib/embeds.ts';
import { splitString, stringToSeconds } from '../../../lib/time.ts';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.KickMembers,
    callback: async (interaction) => {
        const channel = interaction.options.getChannel('channel', false, ChannelLock.CHANNEL_TYPES) || interaction.channel;
        if (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildVoice) {
            replyError(interaction, { description: 'This command is only usable in text or voice channels.', title: 'Invalid Channel' });
            return;
        }

        const durationString = interaction.options.getString('duration', true);

        try {
            var duration = stringToSeconds(splitString(durationString));
        } catch (error) {
            replyError(interaction, { description: String(error) });
            return;
        }

        try {
            const logString = await ChannelLock.create(interaction.user.id, channel, duration);
            replySuccess(interaction, { description: logString, title: 'Create Lock' });
        } catch (error) {
            replyError(interaction, { description: String(error) });
        }
    },
};
