import { Command } from '../commandHandler.js';
import { shutdown } from '../../index.js';
import { log } from '../util.js';

export const command: Command = {
    commands: ['shutdown', 'stop'],
    minArgs: 0,
    maxArgs: 0,
    requiredPermissions: ['ADMINISTRATOR'],
    callback: (message) => {
        const { guild } = message;
        if (!guild) return;

        log(guild, `The bot has been stopped by <@${message.member?.id}>.`);
        shutdown();
    },
};
