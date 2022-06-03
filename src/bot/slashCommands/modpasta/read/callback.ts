import { Attachment } from 'discord.js';
import { pastaStore } from '../../../bot.js';
import { replyError } from '../../../lib/embeds.js';
import { ApplicationCommandCallback, GuildCommandInteraction } from '../../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: ['ManageGuild'],
    callback: async (interaction: GuildCommandInteraction) => {
        const alias = interaction.options.getString('alias', true);

        const pasta = pastaStore.get(alias);
        if (!pasta) return replyError(interaction, 'The specified pasta does not exist.');

        try {
            const attachment = new Attachment(Buffer.from(pasta.toJSON()), pasta.getFileName());
            interaction.reply({ files: [attachment] });
        } catch {
            replyError(interaction, 'Failed to send pasta.');
        }
    },
};
