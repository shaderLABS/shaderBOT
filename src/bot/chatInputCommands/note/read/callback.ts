import { PermissionFlagsBits } from 'discord.js';
import uuid from 'uuid-random';
import { ChatInputCommandCallback } from '../../../chatInputCommandHandler.js';
import { replyError } from '../../../lib/embeds.js';
import { Note } from '../../../lib/note.js';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.KickMembers,
    callback: async (interaction) => {
        const id = interaction.options.getString('id', true);
        if (!uuid.test(id)) return replyError(interaction, 'The specified UUID is invalid.');

        try {
            const note = await Note.getByUUID(id);

            interaction.reply({ embeds: [Note.toEmbed('Note', note.toString())] });
        } catch (error) {
            replyError(interaction, error);
        }
    },
};
