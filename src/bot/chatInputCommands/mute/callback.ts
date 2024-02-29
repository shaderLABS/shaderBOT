import { PermissionFlagsBits } from 'discord.js';
import type { ChatInputCommandCallback } from '../../chatInputCommandHandler.ts';
import { getContextURL } from '../../lib/context.ts';
import { replyError, replySuccess } from '../../lib/embeds.ts';
import { Mute } from '../../lib/punishment/mute.ts';
import { hasPermissionForTarget } from '../../lib/searchMessage.ts';
import { splitString, stringToSeconds } from '../../lib/time.ts';

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
            const logString = await Mute.create(targetUser, reason, duration, member.id, contextURL);
            replySuccess(interaction, logString, 'Mute');
        } catch (error) {
            if (error) replyError(interaction, String(error));
        }
    },
};
