import { PermissionFlagsBits } from 'discord.js';
import { ChatInputCommandCallback } from '../../../chatInputCommandHandler.js';
import { getContextURL } from '../../../lib/context.js';
import { replyError, replySuccess } from '../../../lib/embeds.js';
import { Track } from '../../../lib/punishment/track.js';
import { hasPermissionForTarget } from '../../../lib/searchMessage.js';

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
            replySuccess(interaction, logString, 'Create Track');
        } catch (error) {
            replyError(interaction, String(error));
        }
    },
};
