import { MessageAttachment, MessageEmbed } from 'discord.js';
import { pastas } from '../../bot.js';
import { GuildCommandInteraction } from '../../events/interactionCreate.js';
import { replyError, replyInfo } from '../../lib/embeds.js';
import { similarityLevenshtein } from '../../lib/misc.js';
import { ApplicationCommandCallback } from '../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    callback: async (interaction: GuildCommandInteraction) => {
        const alias = interaction.options.getString('alias', false);

        if (alias) {
            const pasta = pastas.sort((a, b) => similarityLevenshtein(b.alias, alias) - similarityLevenshtein(a.alias, alias)).first();
            if (!pasta || similarityLevenshtein(pasta.alias, alias) < 0.5) return replyError(interaction, 'Pasta not found.');

            try {
                const responseEmbed = pasta.embed ? [new MessageEmbed(pasta.embed)] : [];

                const responseFiles: MessageAttachment[] = [];
                if (pasta.attachments) {
                    responseFiles.push(...pasta.attachments.map((attachment) => new MessageAttachment(attachment)));
                }

                interaction.reply({ content: pasta.message, embeds: responseEmbed, files: responseFiles });
            } catch (error) {
                replyError(interaction, 'The specified pasta is invalid: ' + error, undefined, false);
            }
        } else {
            if (pastas.size === 0) replyInfo(interaction, 'There are no pastas.', undefined, undefined, undefined, true);
            else replyInfo(interaction, pastas.map((pasta) => '`' + pasta.alias + '`').join(', '), 'All Pastas', undefined, undefined, true);
        }
    },
};
