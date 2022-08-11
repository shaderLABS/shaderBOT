import { PermissionFlagsBits } from 'discord.js';
import { ChatInputCommandCallback } from '../../../chatInputCommandHandler.js';
import { getContextURL } from '../../../lib/context.js';
import { replyError } from '../../../lib/embeds.js';
import { Note } from '../../../lib/note.js';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.KickMembers,
    callback: async (interaction) => {
        const targetUser = interaction.options.getUser('user', true);
        const content = interaction.options.getString('content', true);

        const contextURL = await getContextURL(interaction, targetUser.id);
        if (!contextURL) return;

        try {
            const logString = await Note.create(targetUser.id, interaction.user.id, content, contextURL);

            interaction.reply({ embeds: [Note.toEmbed('Add Note', logString)] });
        } catch (error) {
            replyError(interaction, error);
        }
    },
};
