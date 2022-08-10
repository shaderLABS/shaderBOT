import { PermissionFlagsBits } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { ChatInputCommandCallback, GuildCommandInteraction } from '../../../chatInputCommandHandler.js';
import { replyError, replySuccess } from '../../../lib/embeds.js';
import log from '../../../lib/log.js';
import { parseUser, stringToFileName } from '../../../lib/misc.js';
import { Pasta } from '../../../lib/pasta.js';
import { pastaPath, pastaStore } from '../../../pastaHandler.js';

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

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.ManageGuild,
    callback: async (interaction: GuildCommandInteraction) => {
        const alias = interaction.options.getString('alias', true);

        try {
            const pastaData = pastaStore.get(alias)?.toData();
            if (!pastaData) return replyError(interaction, 'The specified pasta does not exist.');

            const objPath = interaction.options.getString('path', true).split('.');
            const rawValue = interaction.options.getString('value', false);
            const jsonValue = rawValue ? JSON.parse(rawValue) : undefined;

            setValue(pastaData, objPath, jsonValue);

            const pasta = new Pasta(pastaData);

            await pasta.save();
            pastaStore.set(pasta.alias, pasta);

            if (alias !== pasta.alias) {
                pastaStore.delete(alias);

                const oldFileName = stringToFileName(alias);
                if (oldFileName !== pasta.getFileName()) await fs.rm(path.join(pastaPath, oldFileName));
            }

            replySuccess(interaction, `Successfully updated the pasta \`${pasta.alias}\`.`, 'Update Pasta');
            log(`${parseUser(interaction.user)} updated the pasta \`${pasta.alias}\`.`, 'Update Pasta');
        } catch (error) {
            replyError(interaction, 'Invalid JSON value.');
        }
    },
};
