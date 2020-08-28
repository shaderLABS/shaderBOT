import { Command } from '../commandHandler.js';
import { shutdown } from '../../index.js';
import log from '../../misc/log.js';

export const command: Command = {
    commands: ['shutdown', 'stop'],
    help: 'Stop the bot.',
    minArgs: 0,
    maxArgs: 0,
    requiredPermissions: ['ADMINISTRATOR'],
    callback: (message) => {
        log(`The bot has been stopped by <@${message.author.id}>.`);
        shutdown();
    },
};
