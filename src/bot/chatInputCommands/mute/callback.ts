import { PermissionFlagsBits } from 'discord.js';
import { ChatInputCommandCallback, GuildCommandInteraction } from '../../chatInputCommandHandler.js';
import { getContextURL } from '../../lib/context.js';
import { replyError, replySuccess } from '../../lib/embeds.js';
import { Punishment } from '../../lib/punishment.js';
import { hasPermissionForTarget } from '../../lib/searchMessage.js';
import { splitString, stringToSeconds } from '../../lib/time.js';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.KickMembers,
    callback: async (interaction: GuildCommandInteraction) => {
        const { member } = interaction;

        const targetUser = interaction.options.getUser('user', true);
        const reason = interaction.options.getString('reason', true);
        const durationString = interaction.options.getString('duration', true);

        if (!(await hasPermissionForTarget(interaction, targetUser, 'moderatable'))) return;

        try {
            var duration = stringToSeconds(splitString(durationString));
        } catch (error) {
            return replyError(interaction, error);
        }

        const contextURL = await getContextURL(interaction, targetUser.id);
        if (!contextURL) return;

        try {
            const logString = await Punishment.createMute(targetUser, reason, duration, member.id, contextURL);
            replySuccess(interaction, logString, 'Mute');
        } catch (error) {
            if (error) replyError(interaction, error);
        }
    },
};
