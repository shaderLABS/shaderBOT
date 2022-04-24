import uuid from 'uuid-random';
import { replyError, replySuccess } from '../../../../lib/embeds.js';
import { hasPermissionForTarget } from '../../../../lib/searchMessage.js';
import { Warning } from '../../../../lib/warning.js';
import { ApplicationCommandCallback, GuildCommandInteraction } from '../../../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: ['KickMembers'],
    callback: async (interaction: GuildCommandInteraction) => {
        const id = interaction.options.getString('id', true);
        if (!uuid.test(id)) return replyError(interaction, 'The specified UUID is invalid.');

        try {
            const warning = await Warning.getByUUID(id);
            if (!(await hasPermissionForTarget(interaction, warning.userID))) return;

            const logString = await warning.delete(interaction.member.id);
            replySuccess(interaction, logString, 'Delete Warning');
        } catch (error) {
            replyError(interaction, error);
        }
    },
};
