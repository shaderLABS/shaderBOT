import { PermissionFlagsBits } from 'discord.js';
import { ChatInputCommandCallback } from '../../chatInputCommandHandler.js';
import { BanAppeal } from '../../lib/banAppeal.js';
import { replyError, replySuccess } from '../../lib/embeds.js';
import { Ban } from '../../lib/punishment/ban.js';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.BanMembers,
    callback: async (interaction) => {
        const targetUser = interaction.options.getUser('user', true);

        try {
            const appeal = await BanAppeal.getPendingByUserID(targetUser.id).catch(() => undefined);
            if (appeal) await appeal.close('accepted', 'You have been unbanned.', interaction.user.id);

            const ban = await Ban.getByUserID(targetUser.id);
            const logString = await ban.lift(interaction.user.id);
            replySuccess(interaction, logString, 'Unban');
        } catch (error) {
            replyError(interaction, String(error));
        }
    },
};
