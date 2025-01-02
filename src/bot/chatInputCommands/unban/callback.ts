import { PermissionFlagsBits } from 'discord.js';
import type { ChatInputCommandCallback } from '../../chatInputCommandHandler.ts';
import { BanAppeal } from '../../lib/banAppeal.ts';
import { replyError, replySuccess } from '../../lib/embeds.ts';
import { Ban } from '../../lib/punishment/ban.ts';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.BanMembers,
    callback: async (interaction) => {
        const targetUser = interaction.options.getUser('user', true);

        try {
            const appeal = await BanAppeal.getPendingByUserID(targetUser.id).catch(() => undefined);
            if (appeal) await appeal.close('accepted', 'You have been unbanned.', interaction.user.id);

            const ban = await Ban.getByUserID(targetUser.id);
            const logString = await ban.lift(interaction.user.id);
            replySuccess(interaction, { description: logString, title: 'Unban' });
        } catch (error) {
            replyError(interaction, { description: String(error) });
        }
    },
};
