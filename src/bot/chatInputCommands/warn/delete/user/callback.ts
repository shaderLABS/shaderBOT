import { PermissionFlagsBits } from 'discord.js';
import type { ChatInputCommandCallback } from '../../../../chatInputCommandHandler.ts';
import { replyError, replySuccess } from '../../../../lib/embeds.ts';
import { hasPermissionForTarget } from '../../../../lib/searchMessage.ts';
import { Warning } from '../../../../lib/warning.ts';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.KickMembers,
    callback: async (interaction) => {
        const targetUser = interaction.options.getUser('user', true);

        try {
            const warning = await Warning.getLatestByUserID(targetUser.id);
            if (!(await hasPermissionForTarget(interaction, warning.userId))) return;

            const logString = await warning.delete(interaction.member.id);
            replySuccess(interaction, logString, 'Delete Warning');
        } catch (error) {
            replyError(interaction, String(error));
        }
    },
};
