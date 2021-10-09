import fs from 'fs/promises';
import path from 'path';
import { pastas } from '../../../bot.js';
import { GuildCommandInteraction } from '../../../events/interactionCreate.js';
import { replyError, replySuccess } from '../../../lib/embeds.js';
import log from '../../../lib/log.js';
import { parseUser } from '../../../lib/misc.js';
import { stringToFileName, writePasta } from '../../../lib/pastaAutoResponse.js';
import { pastaPath } from '../../../pastaHandler.js';
import { ApplicationCommandCallback } from '../../../slashCommandHandler.js';

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
    requiredPermissions: ['MANAGE_GUILD'],
    callback: async (interaction: GuildCommandInteraction) => {
        const alias = interaction.options.getString('alias', true);

        try {
            const pasta = pastas.get(alias);
            if (!pasta) return replyError(interaction, 'The specified pasta does not exist.');

            const objPath = interaction.options.getString('path', true).split('.');

            const rawValue = interaction.options.getString('value', false);
            const jsonValue = rawValue ? JSON.parse(rawValue) : undefined;

            setValue(pasta, objPath, jsonValue);

            pastas.set(pasta.alias, pasta);
            await writePasta(pasta);

            if (alias !== pasta.alias) {
                pastas.delete(alias);
                await fs.rm(path.join(pastaPath, stringToFileName(alias)));
            }

            replySuccess(interaction, `Successfully updated the pasta \`${pasta.alias}\`.`, 'Update Pasta');
            log(`${parseUser(interaction.user)} updated the pasta \`${pasta.alias}\`.`, 'Update Pasta');
        } catch (error) {
            replyError(interaction, 'Invalid JSON value.');
        }
    },
};
