import { Attachment, EmbedBuilder } from 'discord.js';
import { pastas } from '../../bot.js';
import { replyError, replyInfo, sendError } from '../../lib/embeds.js';
import { similarityLevenshtein } from '../../lib/misc.js';
import { ApplicationCommandCallback, GuildCommandInteraction } from '../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    callback: async (interaction: GuildCommandInteraction) => {
        const alias = interaction.options.getString('alias', false);

        if (alias) {
            const pasta = pastas.sort((a, b) => similarityLevenshtein(b.alias, alias) - similarityLevenshtein(a.alias, alias)).first();
            if (!pasta || similarityLevenshtein(pasta.alias, alias) < 0.5) return replyError(interaction, 'Pasta not found.');

            try {
                const responseEmbed = pasta.embed ? [new EmbedBuilder(pasta.embed)] : [];

                const responseFiles: Attachment[] = [];
                if (pasta.attachments) {
                    responseFiles.push(...pasta.attachments.map((attachment) => new Attachment(attachment)));
                }

                await interaction.reply({ content: pasta.message, embeds: responseEmbed, files: responseFiles });
            } catch (error) {
                // interactions get invalidated after API errors, so replying to the interaction here will fail every time
                // this is an API bug: https://github.com/discord/discord-api-docs/issues/3633
                sendError(interaction.channel, `The pasta \`${pasta.alias}\` is invalid: \`${error}\``);
            }
        } else {
            if (pastas.size === 0) replyInfo(interaction, 'There are no pastas.', undefined, undefined, undefined, true);
            else replyInfo(interaction, pastas.map((pasta) => '`' + pasta.alias + '`').join(', '), 'All Pastas', undefined, undefined, true);
        }
    },
};
