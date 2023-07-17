import { PermissionFlagsBits } from 'discord.js';
import uuid from 'uuid-random';
import { ChatInputCommandCallback } from '../../../../chatInputCommandHandler.js';
import { replyError, replySuccess } from '../../../../lib/embeds.js';
import { hasPermissionForTarget } from '../../../../lib/searchMessage.js';
import { Warning } from '../../../../lib/warning.js';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.KickMembers,
    callback: async (interaction) => {
        const id = interaction.options.getString('id', true);
        if (!uuid.test(id)) {
            replyError(interaction, 'The specified UUID is invalid.');
            return;
        }

        try {
            const warning = await Warning.getByUUID(id);
            if (!(await hasPermissionForTarget(interaction, warning.userID))) return;

            const logString = await warning.delete(interaction.member.id);
            replySuccess(interaction, logString, 'Delete Warning');
        } catch (error) {
            replyError(interaction, String(error));
        }
    },
};
