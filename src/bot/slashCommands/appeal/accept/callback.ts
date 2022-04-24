import { BanAppeal } from '../../../lib/banAppeal.js';
import { replyError, replySuccess } from '../../../lib/embeds.js';
import { Punishment } from '../../../lib/punishment.js';
import { hasPermissionForTarget } from '../../../lib/searchMessage.js';
import { ApplicationCommandCallback, GuildCommandInteraction } from '../../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: ['BanMembers'],
    callback: async (interaction: GuildCommandInteraction) => {
        const targetUser = interaction.options.getUser('user', true);
        const reason = interaction.options.getString('reason', true);

        try {
            const appeal = await BanAppeal.getPendingByUserID(targetUser.id);

            if (!(await hasPermissionForTarget(interaction, appeal.userID))) return;
            await interaction.deferReply();

            const logString = await appeal.close('accepted', reason, interaction.user.id);

            const ban = await Punishment.getByUserID(targetUser.id, 'ban');
            await ban.move(interaction.user.id);

            replySuccess(interaction, logString, 'Accept Ban Appeal');
        } catch (error) {
            replyError(interaction, error);
        }
    },
};
