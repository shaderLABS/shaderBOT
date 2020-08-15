import { Command } from '../commandHandler.js';

export const command: Command = {
    commands: ['ping', 'latency'],
    minArgs: 0,
    maxArgs: 0,
    callback: (message) => {
        message.channel.send(Date.now() - message.createdTimestamp + 'ms');
    },
};
