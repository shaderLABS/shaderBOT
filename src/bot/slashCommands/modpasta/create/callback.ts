import { pastas } from '../../../bot.js';
import { replyError, replySuccess } from '../../../lib/embeds.js';
import log from '../../../lib/log.js';
import { parseUser } from '../../../lib/misc.js';
import { writePasta } from '../../../lib/pastaAutoResponse.js';
import { ApplicationCommandCallback, GuildCommandInteraction } from '../../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: ['ManageGuild'],
    callback: async (interaction: GuildCommandInteraction) => {
        const alias = interaction.options.getString('alias', true);

        try {
            const pasta = { alias };

            await writePasta(pasta);
            pastas.set(pasta.alias, pasta);

            replySuccess(interaction, `Successfully created the pasta \`${pasta.alias}\`.`, 'Create Pasta');
            log(`${parseUser(interaction.user)} created the pasta \`${pasta.alias}\`.`, 'Create Pasta');
        } catch {
            replyError(interaction, 'Failed to save pasta.');
        }
    },
};
