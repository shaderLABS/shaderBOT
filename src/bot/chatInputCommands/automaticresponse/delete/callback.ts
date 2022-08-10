import { PermissionFlagsBits } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { automaticResponsePath, automaticResponseStore } from '../../../automaticResponseHandler.js';
import { ChatInputCommandCallback, GuildCommandInteraction } from '../../../chatInputCommandHandler.js';
import { replyError, replySuccess } from '../../../lib/embeds.js';
import log from '../../../lib/log.js';
import { parseUser, stringToFileName } from '../../../lib/misc.js';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.ManageGuild,
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
