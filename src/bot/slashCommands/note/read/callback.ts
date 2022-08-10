import { PermissionFlagsBits } from 'discord.js';
import uuid from 'uuid-random';
import { replyError } from '../../../lib/embeds.js';
import { Note } from '../../../lib/note.js';
import { ApplicationCommandCallback, GuildCommandInteraction } from '../../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: PermissionFlagsBits.KickMembers,
    callback: async (interaction: GuildCommandInteraction) => {
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
