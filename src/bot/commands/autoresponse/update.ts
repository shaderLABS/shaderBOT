import fs from 'fs/promises';
import path from 'path';
import { autoResponsePath } from '../../autoResponseHandler.js';
import { autoResponses } from '../../bot.js';
import { Command } from '../../commandHandler.js';
import { sendError, sendSuccess } from '../../lib/embeds.js';
import log from '../../lib/log.js';
import { parseUser } from '../../lib/misc.js';
import { stringToFileName, writeAutoResponse } from '../../lib/pastaAutoResponse.js';
import { removeArgumentsFromText } from '../../lib/searchMessage.js';

export const command: Command = {
    commands: ['update'],
    superCommands: ['autoresponse'],
    help: 'Update an automatic response.',
    expectedArgs: '<alias> <path> <JSONValue>',
    minArgs: 2,
    maxArgs: null,
    requiredPermissions: ['MANAGE_GUILD'],
    callback: async (message, args, text) => {
        const { channel } = message;

        try {
            let autoResponse = autoResponses.get(args[0]);
            if (!autoResponse) return sendError(channel, 'The specified automatic response does not exist.');

            const objPath = args[1].split('.');

            const rawValue = removeArgumentsFromText(text, args[1]);
            const jsonValue = rawValue ? JSON.parse(rawValue) : undefined;

            setValue(autoResponse, objPath, jsonValue);

            // always recreate because it's a string if it got updated (and the flags might have been changed)
            autoResponse.regex = new RegExp(autoResponse.regex instanceof RegExp ? autoResponse.regex.source : autoResponse.regex, autoResponse.flags);

            autoResponses.set(autoResponse.alias, autoResponse);
            await writeAutoResponse(autoResponse);

            if (args[0] !== autoResponse.alias) {
                autoResponses.delete(args[0]);

                const oldFileName = stringToFileName(args[0]);
                if (oldFileName !== stringToFileName(autoResponse.alias)) await fs.rm(path.join(autoResponsePath, oldFileName));
            }

            sendSuccess(channel, `Successfully updated the automatic response \`${args[0]}\`.`, 'Update Automatic Response');
            log(`${parseUser(message.author)} updated the automatic response \`${args[0]}\`.`, 'Update Automatic Response');
        } catch (error) {
            sendError(channel, 'Invalid JSON value.');
        }
    },
};

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
