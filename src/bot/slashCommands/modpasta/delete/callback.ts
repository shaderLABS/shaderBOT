import fs from 'fs/promises';
import path from 'path';
import { replyError, replySuccess } from '../../../lib/embeds.js';
import log from '../../../lib/log.js';
import { parseUser, stringToFileName } from '../../../lib/misc.js';
import { pastaPath, pastaStore } from '../../../pastaHandler.js';
import { ApplicationCommandCallback, GuildCommandInteraction } from '../../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: ['ManageGuild'],
    callback: async (interaction: GuildCommandInteraction) => {
        const alias = interaction.options.getString('alias', true);

        try {
            if (!pastaStore.delete(alias)) return replyError(interaction, 'The specified pasta does not exist.');
            await fs.rm(path.join(pastaPath, stringToFileName(alias)));

            replySuccess(interaction, `Successfully deleted the pasta \`${alias}\`.`, 'Delete Pasta');
            log(`${parseUser(interaction.user)} deleted the pasta \`${alias}\`.`, 'Delete Pasta');
        } catch {
            replyError(interaction, `Failed to delete pasta \`${alias}\` from the file system.`);
        }
    },
};
