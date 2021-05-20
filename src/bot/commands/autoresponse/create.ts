import { autoResponses } from '../../bot.js';
import { Command } from '../../commandHandler.js';
import { sendError, sendSuccess } from '../../lib/embeds.js';
import log from '../../lib/log.js';
import { parseUser } from '../../lib/misc.js';
import { getStringFromCodeBlock, JSONToAutoResponse, writeAutoResponse } from '../../lib/pastaAutoResponse.js';

export const command: Command = {
    commands: ['create'],
    superCommands: ['autoresponse'],
    help: 'Create an automatic response.',
    expectedArgs: '<JSON>',
    minArgs: 1,
    maxArgs: null,
    requiredPermissions: ['MANAGE_GUILD'],
    callback: async (message, _, text) => {
        const { channel } = message;

        const data = getStringFromCodeBlock(text);
        if (!data) return sendError(channel, 'Invalid data formatting.');

        try {
            const autoResponse = JSONToAutoResponse(data);
            if (!autoResponse.alias) return sendError(channel, 'You must specify an alias.');
            if (!autoResponse.regex) return sendError(channel, 'You must specify a regular expression.');
            if (!autoResponse.message && !autoResponse.embed) return sendError(channel, 'You must specifiy a message or an embed.');

            await writeAutoResponse(autoResponse);
            autoResponses.set(autoResponse.alias, autoResponse);

            sendSuccess(channel, `Successfully created the automatic response \`${autoResponse.alias}\`.`);
            log(`${parseUser(message.author)} created the automatic response \`${autoResponse.alias}\`.`);
        } catch {
            sendError(channel, 'Failed to save the automatic response.');
        }
    },
};
