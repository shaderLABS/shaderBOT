import { PermissionFlagsBits } from 'discord.js';
import { ChatInputCommandCallback, GuildCommandInteraction } from '../../chatInputCommandHandler.js';
import { BanAppeal } from '../../lib/banAppeal.js';
import { replyError, replySuccess } from '../../lib/embeds.js';
import { Punishment } from '../../lib/punishment.js';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.BanMembers,
    callback: async (interaction: GuildCommandInteraction) => {
        const targetUser = interaction.options.getUser('user', true);

        try {
            const appeal = await BanAppeal.getPendingByUserID(targetUser.id).catch(() => undefined);
            if (appeal) await appeal.close('accepted', 'You have been unbanned.', interaction.user.id);

            const ban = await Punishment.getByUserID(targetUser.id, 'ban');
            const logString = await ban.move(interaction.user.id);
            replySuccess(interaction, logString, 'Unban');
        } catch (error) {
            replyError(interaction, error);
        }
    },
};
