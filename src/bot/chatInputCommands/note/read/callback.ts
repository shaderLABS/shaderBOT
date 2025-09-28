import { PermissionFlagsBits } from 'discord.js';
import type { ChatInputCommandCallback } from '../../../chatInputCommandHandler.ts';
import { replyError } from '../../../lib/embeds.ts';
import { isValidUuid } from '../../../lib/misc.ts';
import { Note } from '../../../lib/note.ts';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.KickMembers,
    callback: async (interaction) => {
        const id = interaction.options.getString('id', true);
        if (!isValidUuid(id)) {
            replyError(interaction, { description: 'The specified UUID is invalid.' });
            return;
        }

        try {
            const note = await Note.getByUUID(id);

            interaction.reply({ embeds: [Note.toEmbed('Note', note.toString())] });
        } catch (error) {
            replyError(interaction, { description: String(error) });
        }
    },
};
