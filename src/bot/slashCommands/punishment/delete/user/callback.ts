import { replyError, replySuccess } from '../../../../lib/embeds.js';
import { PastPunishment } from '../../../../lib/punishment.js';
import { hasPermissionForTarget } from '../../../../lib/searchMessage.js';
import { ApplicationCommandCallback, GuildCommandInteraction } from '../../../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: ['BanMembers'],
    callback: async (interaction: GuildCommandInteraction) => {
        const targetUser = interaction.options.getUser('user', true);

        try {
            const entry = await PastPunishment.getAnyLatestByUserID(targetUser.id);
            if (!(await hasPermissionForTarget(interaction, entry.userID))) return;
            const logString = await entry.delete(interaction.user.id);

            replySuccess(interaction, logString, 'Delete Past Punishment Entry');
        } catch (error) {
            replyError(interaction, error);
        }
    },
};
