import { ChannelType } from 'discord.js';
import { replyError, replySuccess } from '../../../lib/embeds.js';
import { LockSlowmode } from '../../../lib/lockSlowmode.js';
import { splitString, stringToSeconds } from '../../../lib/time.js';
import { ApplicationCommandCallback, GuildCommandInteraction } from '../../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: ['KickMembers'],
    callback: async (interaction: GuildCommandInteraction) => {
        const channel = interaction.options.getChannel('channel', false) || interaction.channel;
        if (channel.type !== ChannelType.GuildText && !channel.isThread()) return replyError(interaction, 'This command is only usable in text and thread channels.', 'Invalid Channel');

        const lengthString = interaction.options.getString('length', true);
        const durationString = interaction.options.getString('duration', true);

        try {
            var length = stringToSeconds(splitString(lengthString));
            var duration = stringToSeconds(splitString(durationString));
        } catch (error) {
            return replyError(interaction, error);
        }

        try {
            const logString = await LockSlowmode.createSlowmode(interaction.user.id, channel, duration, length);
            replySuccess(interaction, logString, 'Create Slowmode');
        } catch (error) {
            replyError(interaction, error);
        }
    },
};
