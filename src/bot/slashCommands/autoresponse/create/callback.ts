import { autoResponses } from '../../../bot.js';
import { GuildCommandInteraction } from '../../../events/interactionCreate.js';
import { replyError, replySuccess } from '../../../lib/embeds.js';
import log from '../../../lib/log.js';
import { parseUser } from '../../../lib/misc.js';
import { writeAutoResponse } from '../../../lib/pastaAutoResponse.js';
import { ApplicationCommandCallback } from '../../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: ['MANAGE_GUILD'],
    callback: async (interaction: GuildCommandInteraction) => {
        const alias = interaction.options.getString('alias', true);

        try {
            const regex = new RegExp(interaction.options.getString('regex', true));
            const autoResponse = { alias, regex };

            await writeAutoResponse(autoResponse);
            autoResponses.set(autoResponse.alias, autoResponse);

            replySuccess(interaction, `Successfully created the automatic response \`${autoResponse.alias}\`.`, 'Create Automatic Response');
            log(`${parseUser(interaction.user)} created the automatic response \`${autoResponse.alias}\`.`, 'Create Automatic Response');
        } catch {
            replyError(interaction, 'Failed to save the automatic response.');
        }
    },
};
