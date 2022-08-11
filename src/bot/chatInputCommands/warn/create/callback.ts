import { PermissionFlagsBits } from 'discord.js';
import { ChatInputCommandCallback } from '../../../chatInputCommandHandler.js';
import { getContextURL } from '../../../lib/context.js';
import { replyError, replySuccess } from '../../../lib/embeds.js';
import { hasPermissionForTarget } from '../../../lib/searchMessage.js';
import { Warning } from '../../../lib/warning.js';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.KickMembers,
    callback: async (interaction) => {
        const { member } = interaction;

        const targetUser = interaction.options.getUser('user', true);
        const severity = interaction.options.getInteger('severity', true);
        const reason = interaction.options.getString('reason', true);

        if (!(await hasPermissionForTarget(interaction, targetUser))) return;

        const contextURL = await getContextURL(interaction, targetUser.id);
        if (!contextURL) return;

        try {
            const logString = await Warning.create(targetUser, severity, reason, member.id, contextURL);
            replySuccess(interaction, logString, 'Create Warning');
        } catch (error) {
            replyError(interaction, error);
        }
    },
};
