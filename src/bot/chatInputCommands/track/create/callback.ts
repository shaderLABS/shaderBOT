import { PermissionFlagsBits } from 'discord.js';
import type { ChatInputCommandCallback } from '../../../chatInputCommandHandler.ts';
import { getContextURL } from '../../../lib/context.ts';
import { replyError, replySuccess } from '../../../lib/embeds.ts';
import { Track } from '../../../lib/punishment/track.ts';
import { hasPermissionForTarget } from '../../../lib/searchMessage.ts';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.KickMembers,
    callback: async (interaction) => {
        const { member } = interaction;

        const targetUser = interaction.options.getUser('user', true);
        const reason = interaction.options.getString('reason', true);

        if (!(await hasPermissionForTarget(interaction, targetUser))) return;

        const contextURL = await getContextURL(interaction, targetUser.id);
        if (!contextURL) return;

        try {
            const logString = await Track.create(targetUser, reason, member.id, contextURL);
            replySuccess(interaction, { description: logString, title: 'Create Track' });
        } catch (error) {
            replyError(interaction, { description: String(error) });
        }
    },
};
