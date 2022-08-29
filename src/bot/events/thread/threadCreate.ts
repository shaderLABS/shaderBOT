import { Events } from 'discord.js';
import { settings } from '../../bot.js';
import { Event } from '../../eventHandler.js';
import { StickyThread } from '../../lib/stickyThread.js';

export const event: Event = {
    name: Events.ThreadCreate,
    callback: async (thread) => {
        if (thread.parentId && settings.data.stickyThreadChannelIDs.includes(thread.parentId)) {
            StickyThread.create(thread);
        }

        if (settings.data.threadRoleID) {
            const message = await thread.send('Adding users to thread...');
            await message.edit('<@&' + settings.data.threadRoleID + '>');
            message.delete();
        }
    },
};
