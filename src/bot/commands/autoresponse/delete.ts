import fs from 'fs/promises';
import path from 'path';
import { autoResponsePath } from '../../autoResponseHandler.js';
import { autoResponses } from '../../bot.js';
import { Command } from '../../commandHandler.js';
import { sendError, sendSuccess } from '../../lib/embeds.js';
import log from '../../lib/log.js';
import { parseUser } from '../../lib/misc.js';
import { stringToFileName } from '../../lib/pastaAutoResponse.js';

export const command: Command = {
    commands: ['delete'],
    superCommands: ['autoresponse'],
    help: 'Delete an automatic response.',
    expectedArgs: '<regex>',
    minArgs: 1,
    maxArgs: null,
    requiredPermissions: ['MANAGE_GUILD'],
    callback: async (message, _, text) => {
        const { channel } = message;

        try {
            if (!autoResponses.delete(text)) return sendError(channel, 'The specified automatic response does not exist.');
            await fs.rm(path.join(autoResponsePath, stringToFileName(text)));

            sendSuccess(channel, `Successfully deleted the automatic response \`${text}\`.`);
            log(`${parseUser(message.author)} deleted the automatic response \`${text}\`.`);
        } catch {
            sendError(channel, `Failed to delete automatic response \`${text}\` from the file system.`);
        }
    },
};
