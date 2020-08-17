import { Command } from '../commandHandler.js';
import { TextChannel, MessageEmbed } from 'discord.js';
import axios from 'axios';

export const command: Command = {
    commands: ['backup'],
    expectedArgs: '[text_channel] [limit]',
    minArgs: 0,
    maxArgs: 2,
    requiredPermissions: ['MANAGE_MESSAGES'],
    callback: async (message, args) => {
        const mentionedChannel = message.mentions.channels.first();
        const channel = mentionedChannel || message.channel;
        if (!(channel instanceof TextChannel)) return;

        const limit = +(mentionedChannel ? args[1] : args[0]) || undefined;
        const backupMessages = await channel.messages.fetch({ limit: limit });

        let backupContent = '';
        backupMessages.each((backupMessage) => {
            backupContent += `${backupMessage.author.username}#${backupMessage.author.discriminator}: ${backupMessage.content}\n`;
        });

        const res = await axios.post(
            'https://hastebin.com/documents',
            `BACKUP OF #${channel.name} (${backupMessages.size} MESSAGES)\n\n${backupContent}`
        );

        message.channel.send(
            '',
            new MessageEmbed()
                .setAuthor('BACKUP')
                .setColor('#0000ff')
                .setDescription(
                    `Backup of <#${channel.id}> created. ${backupMessages.size} messages have been [uploaded](https://www.hastebin.com/${res.data.key}).`
                )
        );
    },
};
