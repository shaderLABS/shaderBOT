import { PermissionFlagsBits } from 'discord.js';
import type { ChatInputCommandCallback } from '../../../../chatInputCommandHandler.ts';
import { replyError, replySuccess } from '../../../../lib/embeds.ts';
import { PastPunishment } from '../../../../lib/punishment.ts';
import { hasPermissionForTarget } from '../../../../lib/searchMessage.ts';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.BanMembers,
    callback: async (interaction) => {
        const targetUser = interaction.options.getUser('user', true);

        try {
            const entry = await PastPunishment.getAnyLatestByUserID(targetUser.id);
            if (!(await hasPermissionForTarget(interaction, entry.userID))) return;
            const logString = await entry.delete(interaction.user.id);

            replySuccess(interaction, logString, 'Delete Past Punishment Entry');
        } catch (error) {
            replyError(interaction, String(error));
        }
    },
};
