import { PermissionFlagsBits } from 'discord.js';
import { ChatInputCommandCallback } from '../../chatInputCommandHandler.js';
import { getContextURL } from '../../lib/context.js';
import { replyError, replySuccess } from '../../lib/embeds.js';
import { Punishment } from '../../lib/punishment.js';
import { hasPermissionForTarget } from '../../lib/searchMessage.js';
import { splitString, stringToSeconds } from '../../lib/time.js';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.KickMembers,
    callback: async (interaction) => {
        const { member } = interaction;

        const targetUser = interaction.options.getUser('user', true);
        const reason = interaction.options.getString('reason', true);
        const durationString = interaction.options.getString('duration', true);

        if (!(await hasPermissionForTarget(interaction, targetUser, 'moderatable'))) return;

        try {
            var duration = stringToSeconds(splitString(durationString));
        } catch (error) {
            replyError(interaction, String(error));
            return;
        }

        const contextURL = await getContextURL(interaction, targetUser.id);
        if (!contextURL) return;

        try {
            const logString = await Punishment.createMute(targetUser, reason, duration, member.id, contextURL);
            replySuccess(interaction, logString, 'Mute');
        } catch (error) {
            if (error) replyError(interaction, String(error));
        }
    },
};
