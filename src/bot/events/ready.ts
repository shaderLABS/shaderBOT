import { client } from '../bot.js';
import { Event } from '../eventHandler.js';
import { cleanBackups } from '../lib/backup.js';
import { loadTimeouts } from '../lib/punishments.js';

export const event: Event = {
    name: 'ready',
    callback: () => {
        if (!client.user) return console.error('Failed to login.');
        console.log(`Logged in as '${client.user.username}#${client.user.discriminator}'.`);

        loadTimeouts();
        cleanBackups();
    },
};
