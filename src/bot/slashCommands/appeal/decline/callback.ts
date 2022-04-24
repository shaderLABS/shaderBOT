import { BanAppeal } from '../../../lib/banAppeal.js';
import { replyError, replySuccess } from '../../../lib/embeds.js';
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

            const logString = await appeal.close('declined', reason, interaction.user.id);

            replySuccess(interaction, logString, 'Decline Ban Appeal');
        } catch (error) {
            replyError(interaction, error);
        }
    },
};
