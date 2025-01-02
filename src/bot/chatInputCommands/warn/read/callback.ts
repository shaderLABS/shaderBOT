import { PermissionFlagsBits } from 'discord.js';
import uuid from 'uuid-random';
import type { ChatInputCommandCallback } from '../../../chatInputCommandHandler.ts';
import { replyError, replyInfo } from '../../../lib/embeds.ts';
import { Warning } from '../../../lib/warning.ts';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.KickMembers,
    callback: async (interaction) => {
        const id = interaction.options.getString('id', true);
        if (!uuid.test(id)) {
            replyError(interaction, { description: 'The specified UUID is invalid.' });
            return;
        }

        try {
            const warning = await Warning.getByUUID(id);
            replyInfo(interaction, { description: warning.toString(), title: 'Warning' });
        } catch (error) {
            replyError(interaction, { description: String(error) });
        }
    },
};
