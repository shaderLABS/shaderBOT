import { Collection, Message, Snowflake } from 'discord.js';
import { Event } from '../../eventHandler.js';
import { createBackup } from '../../lib/backup.js';
import log from '../../lib/log.js';
import { isTextOrThreadChannel } from '../../lib/misc.js';

export const event: Event = {
    name: 'messageDeleteBulk',
    callback: (messages: Collection<Snowflake, Message>) => {
        const firstMessage = messages.first();
        if (!firstMessage) return;

        const { channel, guild } = firstMessage;
        if (!isTextOrThreadChannel(channel)) return;

        createBackup(
            channel,
            messages.filter((message) => !message.partial),
            `Created after ${messages.size} messages were purged.`
        ).then((messageCount) => {
            if (messageCount > 0) {
                log(`${messageCount} out of ${messages.size} purged messages have been backed up. Use \`/backup list\` in order to view them.`, 'Backup');
            }
        });
    },
};
