import { MessageAttachment, MessageEmbed } from 'discord.js';
import { pastas } from '../bot.js';
import { Command } from '../commandHandler.js';
import { sendError, sendInfo } from '../lib/embeds.js';
import { similarityLevenshtein } from '../lib/misc.js';

export const command: Command = {
    commands: ['pasta'],
    help: 'Send a specific pasta or a list containing all of them.',
    minArgs: 0,
    maxArgs: null,
    expectedArgs: '[alias]',
    ticketChannels: true,
    callback: async (message, _, text) => {
        const { channel } = message;

        if (text) {
            const pasta = pastas.sort((a, b) => similarityLevenshtein(b.alias, text) - similarityLevenshtein(a.alias, text)).first();
            if (!pasta || similarityLevenshtein(pasta.alias, text) < 0.5) return sendError(channel, 'Pasta not found.');

            try {
                const responseMessageAdditions: (MessageEmbed | MessageAttachment)[] = [];

                if (pasta.embed) {
                    responseMessageAdditions.push(new MessageEmbed(pasta.embed));
                }

                if (pasta.attachments) {
                    responseMessageAdditions.push(...pasta.attachments.map((attachment) => new MessageAttachment(attachment)));
                }

                channel.send(pasta.message || null, responseMessageAdditions);
            } catch (error) {
                sendError(channel, 'The specified pasta is invalid: ' + error);
            }
        } else {
            if (pastas.size === 0) sendInfo(channel, 'There are no pastas.');
            else sendInfo(channel, pastas.map((pasta) => '`' + pasta.alias + '`').join(', '), 'All Pastas');
        }
    },
};
