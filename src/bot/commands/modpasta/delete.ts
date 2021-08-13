import fs from 'fs/promises';
import path from 'path';
import { pastas } from '../../bot.js';
import { Command } from '../../commandHandler.js';
import { sendError, sendSuccess } from '../../lib/embeds.js';
import log from '../../lib/log.js';
import { parseUser } from '../../lib/misc.js';
import { stringToFileName } from '../../lib/pastaAutoResponse.js';
import { pastaPath } from '../../pastaHandler.js';

export const command: Command = {
    commands: ['delete'],
    superCommands: ['modpasta', 'mpasta'],
    help: 'Delete a pasta.',
    expectedArgs: '<alias>',
    minArgs: 1,
    maxArgs: null,
    requiredPermissions: ['MANAGE_GUILD'],
    callback: async (message, _, text) => {
        const { channel } = message;

        try {
            if (!pastas.delete(text)) return sendError(channel, 'The specified pasta does not exist.');
            await fs.rm(path.join(pastaPath, stringToFileName(text)));

            sendSuccess(channel, `Successfully deleted the pasta \`${text}\`.`, 'Delete Pasta');
            log(`${parseUser(message.author)} deleted the pasta \`${text}\`.`, 'Delete Pasta');
        } catch {
            sendError(channel, `Failed to delete pasta \`${text}\` from the file system.`);
        }
    },
};
