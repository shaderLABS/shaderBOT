import { PermissionFlagsBits } from 'discord.js';
import { ChatInputCommandCallback } from '../../../../chatInputCommandHandler.js';
import { replyError, replySuccess } from '../../../../lib/embeds.js';
import { PastPunishment } from '../../../../lib/punishment.js';
import { hasPermissionForTarget } from '../../../../lib/searchMessage.js';

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
