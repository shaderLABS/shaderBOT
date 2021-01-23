import axios from 'axios';
import { Command } from '../commandHandler.js';
import { sendSuccess } from '../lib/embeds.js';

export const command: Command = {
    commands: ['backup'],
    help: 'Backup messages sent in the current channel.',
    expectedArgs: '[text_channel] [limit]',
    minArgs: 0,
    maxArgs: 2,
    requiredPermissions: ['MANAGE_MESSAGES'],
    callback: async (message, args) => {
        const mentionedChannel = message.mentions.channels.first();
        const channel = mentionedChannel || message.channel;

        const limit = +(mentionedChannel ? args[1] : args[0]) || undefined;
        const backupMessages = await channel.messages.fetch({ limit: limit });

        let backupContent = '';
        backupMessages.each(({ author, content, embeds }) => {
            backupContent += `${author.username}#${author.discriminator}: ${content}\n`;
            if (embeds[0]) backupContent += `EMBED: ${embeds[0].description}\n`;
        });

        const res = await axios.post('https://hastebin.com/documents', `BACKUP OF #${channel.name} (${backupMessages.size} MESSAGES)\n\n${backupContent}`);
        sendSuccess(message.channel, `Backup of <#${channel.id}> created. ${backupMessages.size} messages have been [uploaded](https://www.hastebin.com/${res.data.key}).`, 'Backup');
    },
};
