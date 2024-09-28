import { PermissionFlagsBits } from 'discord.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { automaticResponsePath, automaticResponseStore } from '../../../automaticResponseHandler.ts';
import type { ChatInputCommandCallback } from '../../../chatInputCommandHandler.ts';
import { AutomaticResponse } from '../../../lib/automaticResponse.ts';
import { replyError, replySuccess } from '../../../lib/embeds.ts';
import log from '../../../lib/log.ts';
import { parseUser, stringToFileName } from '../../../lib/misc.ts';
import { setObjectValueByStringPath } from '../../../lib/objectManipulation.ts';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.ManageGuild,
    callback: async (interaction) => {
        const alias = interaction.options.getString('alias', true);

        try {
            let automaticResponseData = automaticResponseStore.get(alias)?.toData();
            if (!automaticResponseData) {
                replyError(interaction, 'The specified automatic response does not exist.');
                return;
            }

            const objPath = interaction.options.getString('path', true);
            const rawValue = interaction.options.getString('value', false);
            const jsonValue = rawValue ? JSON.parse(rawValue) : undefined;

            setObjectValueByStringPath(automaticResponseData, objPath, jsonValue);

            const automaticResponse = new AutomaticResponse(automaticResponseData);

            await automaticResponse.save();
            automaticResponseStore.set(automaticResponse.alias, automaticResponse);

            if (alias !== automaticResponse.alias) {
                automaticResponseStore.delete(alias);

                const oldFileName = stringToFileName(alias);
                if (oldFileName !== automaticResponse.getFileName()) await fs.rm(path.join(automaticResponsePath, oldFileName));
            }

            const logString = `${parseUser(interaction.user)} updated the automatic response \`${alias}\`.`;

            replySuccess(interaction, logString, 'Update Automatic Response');
            log(logString, 'Update Automatic Response');
        } catch (error) {
            replyError(interaction, 'Invalid path or JSON value.');
        }
    },
};
