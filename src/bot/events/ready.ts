import { client } from '../bot.js';
import { Event } from '../eventHandler.js';
import { loadTimeouts } from '../lib/punishments.js';

export const event: Event = {
    name: 'ready',
    callback: async () => {
        if (!client.user) return console.error('Failed to login.');
        console.log(`Logged in as '${client.user.tag}'.`);

        loadTimeouts(false);
    },
};
