import { PermissionFlagsBits } from 'discord.js';
import type { ChatInputCommandCallback } from '../../../../chatInputCommandHandler.ts';
import { replyError } from '../../../../lib/embeds.ts';
import { Note } from '../../../../lib/note.ts';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.KickMembers,
    callback: async (interaction) => {
        const targetUser = interaction.options.getUser('user', true);

        try {
            const note = await Note.getLatestByUserID(targetUser.id);
            const logString = await note.delete(interaction.user.id);

            interaction.reply({ embeds: [Note.toEmbed('Delete Note', logString)] });
        } catch (error) {
            replyError(interaction, String(error));
        }
    },
};
