import { PermissionFlagsBits } from 'discord.js';
import { replyError, replySuccess } from '../../../lib/embeds.js';
import log from '../../../lib/log.js';
import { parseUser } from '../../../lib/misc.js';
import { Pasta } from '../../../lib/pasta.js';
import { pastaStore } from '../../../pastaHandler.js';
import { ApplicationCommandCallback, GuildCommandInteraction } from '../../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: PermissionFlagsBits.ManageGuild,
    callback: async (interaction: GuildCommandInteraction) => {
        const alias = interaction.options.getString('alias', true);

        try {
            const pasta = new Pasta({ alias });

            await pasta.save();
            pastaStore.set(pasta.alias, pasta);

            replySuccess(interaction, `Successfully created the pasta \`${pasta.alias}\`.`, 'Create Pasta');
            log(`${parseUser(interaction.user)} created the pasta \`${pasta.alias}\`.`, 'Create Pasta');
        } catch {
            replyError(interaction, 'Failed to save pasta.');
        }
    },
};
