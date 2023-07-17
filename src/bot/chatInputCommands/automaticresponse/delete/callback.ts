import { PermissionFlagsBits } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { automaticResponsePath, automaticResponseStore } from '../../../automaticResponseHandler.js';
import { ChatInputCommandCallback } from '../../../chatInputCommandHandler.js';
import { replyError, replySuccess } from '../../../lib/embeds.js';
import log from '../../../lib/log.js';
import { parseUser, stringToFileName } from '../../../lib/misc.js';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.ManageGuild,
    callback: async (interaction) => {
        const alias = interaction.options.getString('alias', true);

        try {
            if (!automaticResponseStore.delete(alias)) {
                replyError(interaction, 'The specified automatic response does not exist.');
                return;
            }

            await fs.rm(path.join(automaticResponsePath, stringToFileName(alias)));

            const logString = `${parseUser(interaction.user)} deleted the automatic response \`${alias}\`.`;

            replySuccess(interaction, logString, 'Delete Automatic Response');
            log(logString, 'Delete Automatic Response');
        } catch {
            replyError(interaction, `Failed to delete automatic response \`${alias}\` from the file system.`);
        }
    },
};
