import { ChannelType, PermissionFlagsBits } from 'discord.js';
import { ChatInputCommandCallback } from '../../../chatInputCommandHandler.js';
import { replyError, replySuccess } from '../../../lib/embeds.js';
import { LockSlowmode } from '../../../lib/lockSlowmode.js';
import { splitString, stringToSeconds } from '../../../lib/time.js';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.KickMembers,
    callback: async (interaction) => {
        const channel = interaction.options.getChannel('channel', false) || interaction.channel;
        if (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildVoice) {
            return replyError(interaction, 'This command is only usable in text or voice channels.', 'Invalid Channel');
        }

        const durationString = interaction.options.getString('duration', true);

        try {
            var duration = stringToSeconds(splitString(durationString));
        } catch (error) {
            return replyError(interaction, String(error));
        }

        try {
            const logString = await LockSlowmode.createLock(interaction.user.id, channel, duration);
            replySuccess(interaction, logString, 'Create Lock');
        } catch (error) {
            replyError(interaction, String(error));
        }
    },
};
