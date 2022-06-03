import { replyError, replySuccess } from '../../../lib/embeds.js';
import { LockSlowmode } from '../../../lib/lockSlowmode.js';
import { ApplicationCommandCallback, GuildCommandInteraction } from '../../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: ['KickMembers'],
    callback: async (interaction: GuildCommandInteraction) => {
        const channel = interaction.options.getChannel('channel', false) || interaction.channel;
        if (!channel.isText() && !channel.isVoice()) return replyError(interaction, 'This command is only usable in text and voice channels.', 'Invalid Channel');

        try {
            const lock = await LockSlowmode.getByChannelID(channel.id, 'lock');
            const logString = await lock.lift(interaction.user.id);
            replySuccess(interaction, logString, 'Lift Lock');
        } catch (error) {
            replyError(interaction, error);
        }
    },
};
