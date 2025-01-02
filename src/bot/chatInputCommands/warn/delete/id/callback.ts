import { PermissionFlagsBits } from 'discord.js';
import uuid from 'uuid-random';
import type { ChatInputCommandCallback } from '../../../../chatInputCommandHandler.ts';
import { replyError, replySuccess } from '../../../../lib/embeds.ts';
import { hasPermissionForTarget } from '../../../../lib/searchMessage.ts';
import { Warning } from '../../../../lib/warning.ts';

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
            if (!(await hasPermissionForTarget(interaction, warning.userId))) return;

            const logString = await warning.delete(interaction.member.id);
            replySuccess(interaction, { description: logString, title: 'Delete Warning' });
        } catch (error) {
            replyError(interaction, { description: String(error) });
        }
    },
};
