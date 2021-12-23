import { client } from '../bot.js';
import { Event } from '../eventHandler.js';
import { getGuild } from '../lib/misc.js';
import { loadTimeouts } from '../lib/punishments.js';
import { registerSlashCommands } from '../slashCommandHandler.js';

export const event: Event = {
    name: 'ready',
    callback: async () => {
        if (!client.user) return console.error('Failed to login.');
        console.log(`Logged in as '${client.user.tag}'.`);

        loadTimeouts(false);

        const guild = getGuild();
        if (!guild) return console.error('Failed to load slash commands: the specified guild was not found.');
        await registerSlashCommands('./build/bot/slashCommands');
    },
};
