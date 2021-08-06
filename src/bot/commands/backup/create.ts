import { TextChannel } from 'discord.js';
import { Command, syntaxError } from '../../commandHandler.js';
import { createBackup } from '../../lib/backup.js';
import { sendError, sendSuccess } from '../../lib/embeds.js';

const expectedArgs = '[text_channel] [limit]';

export const command: Command = {
    commands: ['create'],
    superCommands: ['backup'],
    help: 'Create a local and encrypted backup of messages sent in the current or specified channel.',
    expectedArgs,
    minArgs: 0,
    maxArgs: 2,
    requiredPermissions: ['MANAGE_MESSAGES'],
    callback: async (message, args) => {
        const { channel } = message;

        const mentionedChannel = message.mentions.channels.first();
        const backupChannel = mentionedChannel || channel;
        if (!(backupChannel instanceof TextChannel)) return sendError(channel, 'You have specified an invalid channel.');

        const limit = +(mentionedChannel ? args[1] : args[0]) || undefined;
        if (limit && limit < 1) return syntaxError(channel, 'backup create ' + expectedArgs);

        const backupMessages = await backupChannel.messages.fetch({ limit: limit });

        try {
            await createBackup(backupChannel, backupMessages);
            sendSuccess(channel, `Backup of <#${backupChannel.id}> created. ${backupMessages.size} messages have been encrypted and saved.`, 'Backup');
        } catch (error) {
            sendError(channel, error);
        }
    },
};
