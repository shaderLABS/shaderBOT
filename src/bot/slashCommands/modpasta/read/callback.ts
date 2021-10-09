import { MessageAttachment } from 'discord.js';
import { pastas } from '../../../bot.js';
import { GuildCommandInteraction } from '../../../events/interactionCreate.js';
import { replyError } from '../../../lib/embeds.js';
import { stringToFileName } from '../../../lib/pastaAutoResponse.js';
import { ApplicationCommandCallback } from '../../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: ['MANAGE_GUILD'],
    callback: async (interaction: GuildCommandInteraction) => {
        const alias = interaction.options.getString('alias', true);

        const pasta = pastas.get(alias);
        if (!pasta) return replyError(interaction, 'The specified pasta does not exist.');

        try {
            const attachment = new MessageAttachment(Buffer.from(JSON.stringify(pasta, null, 4)), stringToFileName(pasta.alias));
            interaction.reply({ files: [attachment] });
        } catch {
            replyError(interaction, 'Failed to send pasta.');
        }
    },
};
