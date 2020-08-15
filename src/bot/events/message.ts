import { Event } from '../eventHandler.js';
import { Message } from 'discord.js';
import { CustomClient } from '../bot.js';
import { runCommand } from '../commandHandler.js';
import cfg from '../../../cfg.json';

export const event: Event = {
    name: 'message',
    callback: (client: CustomClient, message: Message) => {
        const { content } = message;
        if (!content.startsWith(cfg.prefix) || message.author.bot || message.channel.type !== 'text') return;

        const [invoke, ...args] = content.slice(cfg.prefix.length).trim().split(/[ ]+/);
        const command = client.commands.get(invoke);
        if (command) runCommand(command, message, invoke, args);
    },
};
