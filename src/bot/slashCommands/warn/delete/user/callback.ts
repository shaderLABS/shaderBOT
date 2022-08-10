import { PermissionFlagsBits } from 'discord.js';
import { replyError, replySuccess } from '../../../../lib/embeds.js';
import { hasPermissionForTarget } from '../../../../lib/searchMessage.js';
import { Warning } from '../../../../lib/warning.js';
import { ApplicationCommandCallback, GuildCommandInteraction } from '../../../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: PermissionFlagsBits.KickMembers,
    callback: async (interaction: GuildCommandInteraction) => {
        const targetUser = interaction.options.getUser('user', true);

        try {
            const warning = await Warning.getLatestByUserID(targetUser.id);
            if (!(await hasPermissionForTarget(interaction, warning.userID))) return;

            const logString = await warning.delete(interaction.member.id);
            replySuccess(interaction, logString, 'Delete Warning');
        } catch (error) {
            replyError(interaction, error);
        }
    },
};
