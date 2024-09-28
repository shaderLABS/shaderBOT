import { PermissionFlagsBits } from 'discord.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { automaticResponsePath, automaticResponseStore } from '../../../automaticResponseHandler.ts';
import type { ChatInputCommandCallback } from '../../../chatInputCommandHandler.ts';
import { replyError, replySuccess } from '../../../lib/embeds.ts';
import log from '../../../lib/log.ts';
import { parseUser, stringToFileName } from '../../../lib/misc.ts';

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
