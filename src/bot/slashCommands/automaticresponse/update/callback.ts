import { PermissionFlagsBits } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { automaticResponsePath, automaticResponseStore } from '../../../automaticResponseHandler.js';
import { AutomaticResponse } from '../../../lib/automaticResponse.js';
import { replyError, replySuccess } from '../../../lib/embeds.js';
import log from '../../../lib/log.js';
import { parseUser, stringToFileName } from '../../../lib/misc.js';
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
    requiredPermissions: PermissionFlagsBits.ManageGuild,
    callback: async (interaction: GuildCommandInteraction) => {
        const alias = interaction.options.getString('alias', true);

        try {
            let automaticResponseData = automaticResponseStore.get(alias)?.toData();
            if (!automaticResponseData) return replyError(interaction, 'The specified automatic response does not exist.');

            const objPath = interaction.options.getString('path', true).split('.');
            const rawValue = interaction.options.getString('value', false);
            const jsonValue = rawValue ? JSON.parse(rawValue) : undefined;

            setValue(automaticResponseData, objPath, jsonValue);

            const automaticResponse = new AutomaticResponse(automaticResponseData);

            await automaticResponse.save();
            automaticResponseStore.set(automaticResponse.alias, automaticResponse);

            if (alias !== automaticResponse.alias) {
                automaticResponseStore.delete(alias);

                const oldFileName = stringToFileName(alias);
                if (oldFileName !== automaticResponse.getFileName()) await fs.rm(path.join(automaticResponsePath, oldFileName));
            }

            replySuccess(interaction, `Successfully updated the automatic response \`${alias}\`.`, 'Update Automatic Response');
            log(`${parseUser(interaction.user)} updated the automatic response \`${alias}\`.`, 'Update Automatic Response');
        } catch (error) {
            replyError(interaction, 'Invalid JSON value.');
        }
    },
};
