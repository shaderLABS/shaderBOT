import { PermissionFlagsBits } from 'discord.js';
import { ChatInputCommandCallback } from '../../../../chatInputCommandHandler.js';
import { replyError, replySuccess } from '../../../../lib/embeds.js';
import { hasPermissionForTarget } from '../../../../lib/searchMessage.js';
import { Warning } from '../../../../lib/warning.js';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.KickMembers,
    callback: async (interaction) => {
        const targetUser = interaction.options.getUser('user', true);

        try {
            const warning = await Warning.getLatestByUserID(targetUser.id);
            if (!(await hasPermissionForTarget(interaction, warning.userID))) return;

            const logString = await warning.delete(interaction.member.id);
            replySuccess(interaction, logString, 'Delete Warning');
        } catch (error) {
            replyError(interaction, String(error));
        }
    },
};
