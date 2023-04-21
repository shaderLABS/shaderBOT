import { PermissionFlagsBits } from 'discord.js';
import uuid from 'uuid-random';
import { ChatInputCommandCallback } from '../../../chatInputCommandHandler.js';
import { replyError, replyInfo } from '../../../lib/embeds.js';
import { Warning } from '../../../lib/warning.js';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.KickMembers,
    callback: async (interaction) => {
        const id = interaction.options.getString('id', true);
        if (!uuid.test(id)) return replyError(interaction, 'The specified UUID is invalid.');

        try {
            const warning = await Warning.getByUUID(id);
            replyInfo(interaction, warning.toString(), 'Warning');
        } catch (error) {
            replyError(interaction, String(error));
        }
    },
};
