import { ChannelType, PermissionFlagsBits } from 'discord.js';
import { ChatInputCommandCallback } from '../../../chatInputCommandHandler.js';
import { replyError, replySuccess } from '../../../lib/embeds.js';
import { LockSlowmode } from '../../../lib/lockSlowmode.js';
import { splitString, stringToSeconds } from '../../../lib/time.js';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.KickMembers,
    callback: async (interaction) => {
        const channel = interaction.options.getChannel('channel', false) || interaction.channel;
        if (channel.type !== ChannelType.GuildText && !channel.isThread()) {
            replyError(interaction, 'This command is only usable in text or thread channels.', 'Invalid Channel');
            return;
        }

        const lengthString = interaction.options.getString('length', true);
        const durationString = interaction.options.getString('duration', true);

        try {
            var length = stringToSeconds(splitString(lengthString));
            var duration = stringToSeconds(splitString(durationString));
        } catch (error) {
            replyError(interaction, String(error));
            return;
        }

        try {
            const logString = await LockSlowmode.createSlowmode(interaction.user.id, channel, duration, length);
            replySuccess(interaction, logString, 'Create Slowmode');
        } catch (error) {
            replyError(interaction, String(error));
        }
    },
};
