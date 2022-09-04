import { ChannelType, Events, PartialMessage } from 'discord.js';
import { Event } from '../../eventHandler.js';
import { createBackup } from '../../lib/backup.js';
import log from '../../lib/log.js';

export const event: Event = {
    name: Events.MessageBulkDelete,
    callback: async (messages) => {
        const backupMessages = messages.filter((message): message is Exclude<typeof message, PartialMessage> => !message.partial);
        const firstMessage = backupMessages.first();
        if (!firstMessage) return;

        const { channel } = firstMessage;
        if (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildVoice && !channel.isThread()) return;

        const messageCount = await createBackup(channel, backupMessages, `Created after ${messages.size} messages were bulk deleted.`);

        if (messageCount > 0) {
            log(`${messageCount} out of ${messages.size} bulk deleted messages have been backed up. Use \`/backup list\` in order to view them.`, 'Bulk Delete Backup');
        }
    },
};
