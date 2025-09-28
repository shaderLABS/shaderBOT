import { PermissionFlagsBits } from 'discord.js';
import type { ChatInputCommandCallback } from '../../../chatInputCommandHandler.ts';
import { replyError } from '../../../lib/embeds.ts';
import { isValidUuid } from '../../../lib/misc.ts';
import { editApsect } from '../shared.ts';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.KickMembers,
    callback: (interaction) => {
        const id = interaction.options.getString('id', true);
        if (!isValidUuid(id)) {
            replyError(interaction, { description: 'The specified UUID is invalid.' });
            return;
        }

        editApsect(interaction, id);
    },
};
