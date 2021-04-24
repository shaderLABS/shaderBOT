import { MessageAttachment } from 'discord.js';
import { settings } from '../../bot.js';
import { Command } from '../../commandHandler.js';

export const command: Command = {
    commands: ['list'],
    superCommands: ['configuration', 'config'],
    help: "Print the bot's current configuration.",
    minArgs: 0,
    maxArgs: 0,
    requiredPermissions: ['MANAGE_GUILD'],
    callback: (message) => {
        const attachment = new MessageAttachment(Buffer.from(JSON.stringify(settings, null, 4)), 'configuration.json');
        message.channel.send(attachment);
    },
};
