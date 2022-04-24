import { ThreadChannel } from 'discord.js';
import { settings } from '../bot.js';
import { Event } from '../eventHandler.js';

export const event: Event = {
    name: 'threadCreate',
    callback: async (thread: ThreadChannel) => {
        if (!settings.data.threadRoleID) return;

        const message = await thread.send('Adding users to thread...');
        await message.edit('<@&' + settings.data.threadRoleID + '>');
        message.delete();
    },
};
