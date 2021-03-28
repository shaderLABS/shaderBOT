import { shutdown } from '../../index.js';
import { Command } from '../commandHandler.js';
import log from '../lib/log.js';

export const command: Command = {
    commands: ['restart'],
    help: 'Restart the bot.',
    minArgs: 0,
    maxArgs: 0,
    requiredPermissions: ['BAN_MEMBERS'],
    callback: async (message) => {
        await log(`The bot has been restarted by <@${message.author.id}>.`);
        shutdown();
    },
};
