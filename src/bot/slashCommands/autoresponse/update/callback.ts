import fs from 'fs/promises';
import path from 'path';
import { autoResponsePath } from '../../../autoResponseHandler.js';
import { autoResponses } from '../../../bot.js';
import { replyError, replySuccess } from '../../../lib/embeds.js';
import log from '../../../lib/log.js';
import { parseUser } from '../../../lib/misc.js';
import { stringToFileName, writeAutoResponse } from '../../../lib/pastaAutoResponse.js';
import { ApplicationCommandCallback, GuildCommandInteraction } from '../../../slashCommandHandler.js';

function setValue(obj: any, path: string[], value: any) {
    path.reduce((a, b, i) => {
        if (i + 1 === path.length) {
            a[b] = value;
            return value;
        }
        if (a[b] === undefined) a[b] = {};
        return a[b];
    }, obj);
}

export const command: ApplicationCommandCallback = {
    requiredPermissions: ['ManageGuild'],
    callback: async (interaction: GuildCommandInteraction) => {
        const alias = interaction.options.getString('alias', true);

        try {
            let autoResponse = autoResponses.get(alias);
            if (!autoResponse) return replyError(interaction, 'The specified automatic response does not exist.');

            const objPath = interaction.options.getString('path', true).split('.');

            const rawValue = interaction.options.getString('value', false);
            const jsonValue = rawValue ? JSON.parse(rawValue) : undefined;

            setValue(autoResponse, objPath, jsonValue);

            // always recreate because it's a string if it got updated (and the flags might have been changed)
            autoResponse.regex = new RegExp(autoResponse.regex instanceof RegExp ? autoResponse.regex.source : autoResponse.regex, autoResponse.flags);

            autoResponses.set(autoResponse.alias, autoResponse);
            await writeAutoResponse(autoResponse);

            if (alias !== autoResponse.alias) {
                autoResponses.delete(alias);

                const oldFileName = stringToFileName(alias);
                if (oldFileName !== stringToFileName(autoResponse.alias)) await fs.rm(path.join(autoResponsePath, oldFileName));
            }

            replySuccess(interaction, `Successfully updated the automatic response \`${alias}\`.`, 'Update Automatic Response');
            log(`${parseUser(interaction.user)} updated the automatic response \`${alias}\`.`, 'Update Automatic Response');
        } catch (error) {
            replyError(interaction, 'Invalid JSON value.');
        }
    },
};
