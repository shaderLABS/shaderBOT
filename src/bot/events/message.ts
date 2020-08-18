import { Event } from '../eventHandler.js';
import { Message } from 'discord.js';
import { commands, settings } from '../bot.js';
import { runCommand } from '../commandHandler.js';

export const event: Event = {
    name: 'message',
    callback: (message: Message) => {
        const { content } = message;
        if (!content.startsWith(settings.prefix) || message.author.bot || message.channel.type !== 'text') return;

        const [invoke, ...args] = content.slice(settings.prefix.length).trim().split(/[ ]+/);
        const command = commands.get(invoke);
        if (command) runCommand(command, message, invoke, args);
    },
};
