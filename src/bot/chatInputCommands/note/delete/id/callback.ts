import { PermissionFlagsBits } from 'discord.js';
import uuid from 'uuid-random';
import { ChatInputCommandCallback } from '../../../../chatInputCommandHandler.js';
import { replyError } from '../../../../lib/embeds.js';
import { Note } from '../../../../lib/note.js';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.KickMembers,
    callback: async (interaction) => {
        const id = interaction.options.getString('id', true);
        if (!uuid.test(id)) {
            replyError(interaction, 'The specified UUID is invalid.');
            return;
        }

        try {
            const note = await Note.getByUUID(id);
            const logString = await note.delete(interaction.user.id);

            interaction.reply({ embeds: [Note.toEmbed('Delete Note', logString)] });
        } catch (error) {
            replyError(interaction, String(error));
        }
    },
};
