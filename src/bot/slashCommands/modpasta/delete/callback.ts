import fs from 'fs/promises';
import path from 'path';
import { pastas } from '../../../bot.js';
import { GuildCommandInteraction } from '../../../events/interactionCreate.js';
import { replyError, replySuccess } from '../../../lib/embeds.js';
import log from '../../../lib/log.js';
import { parseUser } from '../../../lib/misc.js';
import { stringToFileName } from '../../../lib/pastaAutoResponse.js';
import { pastaPath } from '../../../pastaHandler.js';
import { ApplicationCommandCallback } from '../../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: ['MANAGE_GUILD'],
    callback: async (interaction: GuildCommandInteraction) => {
        const alias = interaction.options.getString('alias', true);

        try {
            if (!pastas.delete(alias)) return replyError(interaction, 'The specified pasta does not exist.');
            await fs.rm(path.join(pastaPath, stringToFileName(alias)));

            replySuccess(interaction, `Successfully deleted the pasta \`${alias}\`.`, 'Delete Pasta');
            log(`${parseUser(interaction.user)} deleted the pasta \`${alias}\`.`, 'Delete Pasta');
        } catch {
            replyError(interaction, `Failed to delete pasta \`${alias}\` from the file system.`);
        }
    },
};
