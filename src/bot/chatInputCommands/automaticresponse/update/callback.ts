import { PermissionFlagsBits } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { automaticResponsePath, automaticResponseStore } from '../../../automaticResponseHandler.js';
import { ChatInputCommandCallback } from '../../../chatInputCommandHandler.js';
import { AutomaticResponse } from '../../../lib/automaticResponse.js';
import { replyError, replySuccess } from '../../../lib/embeds.js';
import log from '../../../lib/log.js';
import { parseUser, stringToFileName } from '../../../lib/misc.js';
import { setObjectValueByStringPath } from '../../../lib/objectManipulation.js';

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
