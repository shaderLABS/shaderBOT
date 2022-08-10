import { PermissionFlagsBits } from 'discord.js';
import { ChatInputCommandCallback, GuildCommandInteraction } from '../../../../chatInputCommandHandler.js';
import { replyError } from '../../../../lib/embeds.js';
import { Note } from '../../../../lib/note.js';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.KickMembers,
    callback: async (interaction: GuildCommandInteraction) => {
        const targetUser = interaction.options.getUser('user', true);

        try {
            const note = await Note.getLatestByUserID(targetUser.id);
            const logString = await note.delete(interaction.user.id);

            interaction.reply({ embeds: [Note.toEmbed('Delete Note', logString)] });
        } catch (error) {
            replyError(interaction, error);
        }
    },
};
