import { pastas } from '../../bot.js';
import { Command } from '../../commandHandler.js';
import { sendError, sendSuccess } from '../../lib/embeds.js';
import log from '../../lib/log.js';
import { parseUser } from '../../lib/misc.js';
import { getStringFromCodeBlock, writePasta } from '../../lib/pastaAutoResponse.js';
import { Pasta } from '../../pastaHandler.js';

export const command: Command = {
    commands: ['create'],
    superCommands: ['modpasta', 'mpasta'],
    help: 'Create a pasta.',
    expectedArgs: '<JSON>',
    minArgs: 1,
    maxArgs: null,
    requiredPermissions: ['MANAGE_GUILD'],
    callback: async (message, _, text) => {
        const { channel } = message;

        const data = getStringFromCodeBlock(text);
        if (!data) return sendError(channel, 'Invalid data formatting.');

        try {
            const pasta: Pasta = JSON.parse(data);
            if (!pasta.alias) return sendError(channel, 'You must specify an alias.');
            if (!pasta.message && !pasta.embed) return sendError(channel, 'You must specifiy a message or an embed.');

            await writePasta(pasta);
            pastas.set(pasta.alias, pasta);

            sendSuccess(channel, `Successfully created the pasta \`${pasta.alias}\`.`);
            log(`${parseUser(message.author)} created the pasta \`${pasta.alias}\`.`);
        } catch {
            sendError(channel, 'Failed to save pasta.');
        }
    },
};
