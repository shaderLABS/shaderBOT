import fs from 'fs/promises';
import path from 'path';
import { autoResponsePath } from '../../../autoResponseHandler.js';
import { autoResponses } from '../../../bot.js';
import { replyError, replySuccess } from '../../../lib/embeds.js';
import log from '../../../lib/log.js';
import { parseUser } from '../../../lib/misc.js';
import { stringToFileName } from '../../../lib/pastaAutoResponse.js';
import { ApplicationCommandCallback, GuildCommandInteraction } from '../../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: ['ManageGuild'],
    callback: async (interaction: GuildCommandInteraction) => {
        const alias = interaction.options.getString('alias', true);

        try {
            if (!autoResponses.delete(alias)) return replyError(interaction, 'The specified automatic response does not exist.');
            await fs.rm(path.join(autoResponsePath, stringToFileName(alias)));

            replySuccess(interaction, `Successfully deleted the automatic response \`${alias}\`.`, 'Delete Automatic Response');
            log(`${parseUser(interaction.user)} deleted the automatic response \`${alias}\`.`, 'Delete Automatic Response');
        } catch {
            replyError(interaction, `Failed to delete automatic response \`${alias}\` from the file system.`);
        }
    },
};
