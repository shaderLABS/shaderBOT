import { pastaStore } from '../../bot.js';
import { replyError, replyInfo } from '../../lib/embeds.js';
import { similarityLevenshtein } from '../../lib/misc.js';
import { ApplicationCommandCallback, GuildCommandInteraction } from '../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    callback: async (interaction: GuildCommandInteraction) => {
        const alias = interaction.options.getString('alias', false);

        if (alias) {
            const pasta = pastaStore.sort((a, b) => similarityLevenshtein(b.alias, alias) - similarityLevenshtein(a.alias, alias)).first();
            if (!pasta || similarityLevenshtein(pasta.alias, alias) < 0.5) return replyError(interaction, 'Pasta not found.');

            try {
                await pasta.reply(interaction);
            } catch (error) {
                replyError(interaction, `The pasta \`${pasta.alias}\` is invalid: \`${error}\``);
            }
        } else {
            if (pastaStore.size === 0) replyInfo(interaction, 'There are no pastas.', undefined, undefined, undefined, true);
            else replyInfo(interaction, pastaStore.map((pasta) => '`' + pasta.alias + '`').join(', '), 'All Pastas', undefined, undefined, true);
        }
    },
};
