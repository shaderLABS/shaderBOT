import fs from 'fs/promises';
import path from 'path';
import { automaticResponsePath } from '../../../automaticResponseHandler.js';
import { automaticResponseStore } from '../../../bot.js';
import { replyError, replySuccess } from '../../../lib/embeds.js';
import log from '../../../lib/log.js';
import { parseUser, stringToFileName } from '../../../lib/misc.js';
import { ApplicationCommandCallback, GuildCommandInteraction } from '../../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: ['ManageGuild'],
    callback: async (interaction: GuildCommandInteraction) => {
        const alias = interaction.options.getString('alias', true);

        try {
            if (!automaticResponseStore.delete(alias)) return replyError(interaction, 'The specified automatic response does not exist.');
            await fs.rm(path.join(automaticResponsePath, stringToFileName(alias)));

            replySuccess(interaction, `Successfully deleted the automatic response \`${alias}\`.`, 'Delete Automatic Response');
            log(`${parseUser(interaction.user)} deleted the automatic response \`${alias}\`.`, 'Delete Automatic Response');
        } catch {
            replyError(interaction, `Failed to delete automatic response \`${alias}\` from the file system.`);
        }
    },
};
