import { MessageAttachment } from 'discord.js';
import { autoResponses } from '../../bot.js';
import { Command } from '../../commandHandler.js';
import { sendError, sendInfo } from '../../lib/embeds.js';
import { autoResponseToJSON, stringToFileName } from '../../lib/pastaAutoResponse.js';

export const command: Command = {
    commands: ['read'],
    superCommands: ['autoresponse'],
    help: 'Send the JSON data of a specific automatic response or a list containing all of them.',
    expectedArgs: '[alias]',
    minArgs: 0,
    maxArgs: null,
    requiredPermissions: ['MANAGE_GUILD'],
    callback: (message, _, text) => {
        const { channel } = message;

        if (text) {
            const autoResponse = autoResponses.get(text);
            if (!autoResponse) return sendError(channel, 'The specified automatic response does not exist.');

            try {
                const attachment = new MessageAttachment(Buffer.from(autoResponseToJSON(autoResponse)), stringToFileName(text));
                channel.send({ files: [attachment] });
            } catch {
                sendError(channel, 'Failed to send automatic response.');
            }
        } else {
            if (autoResponses.size === 0) return sendInfo(channel, 'There are no automatic responses.');
            sendInfo(channel, '`' + autoResponses.keyArray().join('`, `') + '`', 'All Automatic Responses');
        }
    },
};
