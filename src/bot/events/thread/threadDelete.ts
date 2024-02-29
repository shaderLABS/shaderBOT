import { Events } from 'discord.js';
import type { Event } from '../../eventHandler.ts';
import { Backup } from '../../lib/backup.ts';
import log from '../../lib/log.ts';
import { StickyThread } from '../../lib/stickyThread.ts';

export const event: Event = {
    name: Events.ThreadDelete,
    callback: async (thread) => {
        let logContent = `The thread #${thread.name} has been deleted. `;

        const backup = await Backup.create(thread).catch(() => undefined);
        logContent += backup ? `${backup.size} cached messages have been encrypted and saved. ` : 'There were no cached messages to save. ';

        const stickyThread = await StickyThread.getByThreadID(thread.id).catch(() => undefined);
        if (stickyThread) {
            stickyThread.delete();
            logContent += 'The sticky flag has been deleted. ';
        }

        log(logContent, 'Delete Thread');
    },
};
