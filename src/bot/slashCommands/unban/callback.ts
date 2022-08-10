import { PermissionFlagsBits } from 'discord.js';
import { BanAppeal } from '../../lib/banAppeal.js';
import { replyError, replySuccess } from '../../lib/embeds.js';
import { Punishment } from '../../lib/punishment.js';
import { ApplicationCommandCallback, GuildCommandInteraction } from '../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
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
