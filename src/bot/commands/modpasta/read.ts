import { MessageAttachment } from 'discord.js';
import { pastas } from '../../bot.js';
import { Command } from '../../commandHandler.js';
import { sendError } from '../../lib/embeds.js';
import { aliasToFileName } from '../../lib/pasta.js';

export const command: Command = {
    commands: ['read'],
    superCommands: ['modpasta', 'mpasta'],
    help: 'Send the JSON data of a specific pasta.',
    expectedArgs: '<alias>',
    minArgs: 1,
    maxArgs: null,
    requiredPermissions: ['MANAGE_GUILD'],
    callback: (message, _, text) => {
        const { channel } = message;

        const pasta = pastas.get(text);
        if (!pasta) return sendError(channel, 'The specified pasta does not exist.');

        try {
            const attachment = new MessageAttachment(Buffer.from(JSON.stringify(pasta, null, 4)), aliasToFileName(pasta.alias));
            channel.send(attachment);
        } catch {
            sendError(channel, 'Failed to send pasta.');
        }
    },
};
