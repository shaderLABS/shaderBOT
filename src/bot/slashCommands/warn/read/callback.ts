import { PermissionFlagsBits } from 'discord.js';
import uuid from 'uuid-random';
import { replyError, replyInfo } from '../../../lib/embeds.js';
import { Warning } from '../../../lib/warning.js';
import { ApplicationCommandCallback, GuildCommandInteraction } from '../../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: PermissionFlagsBits.KickMembers,
    callback: async (interaction: GuildCommandInteraction) => {
        const id = interaction.options.getString('id', true);
        if (!uuid.test(id)) return replyError(interaction, 'The specified UUID is invalid.');

        try {
            const warning = await Warning.getByUUID(id);
            replyInfo(interaction, warning.toString(), 'Warning');
        } catch (error) {
            replyError(interaction, error);
        }
    },
};
