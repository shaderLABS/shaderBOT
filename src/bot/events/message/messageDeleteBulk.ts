import { ChannelType, Events, PartialMessage } from 'discord.js';
import { Event } from '../../eventHandler.js';
import { Backup } from '../../lib/backup.js';
import log from '../../lib/log.js';

export const event: Event = {
    name: Events.MessageBulkDelete,
    callback: async (messages) => {
        const backupMessages = messages.filter((message): message is Exclude<typeof message, PartialMessage> => !message.partial);
        const firstMessage = backupMessages.first();
        if (!firstMessage) return;

        const { channel } = firstMessage;
        if (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildVoice && !channel.isThread()) return;

        const backup = await Backup.create(channel, backupMessages, `Created after ${messages.size} messages were bulk deleted.`);

        if (Number(backup.size) > 0) {
            log(`${backup.size} out of ${messages.size} bulk deleted messages have been backed up. Use \`/backup list\` in order to view them.`, 'Bulk Delete Backup');
        }
    },
};
