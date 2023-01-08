import { Events } from 'discord.js';
import { client, timeoutStore } from '../bot.js';
import { Event } from '../eventHandler.js';
import { Backup } from '../lib/backup.js';
import { rotateBanner } from '../lib/banner.js';
import { getGuild } from '../lib/misc.js';
import { RandomPresence } from '../lib/presence.js';
import { StickyThread } from '../lib/stickyThread.js';

class DailyTasks {
    private static run() {
        timeoutStore.load(true);
        Backup.clean();

        RandomPresence.set(client);
        rotateBanner();

        DailyTasks.schedule();
    }

    public static schedule() {
        const date = new Date();
        const scheduleToday = -date.getTime() + date.setHours(23, 59, 0, 0);

        // if today's time has passed, use tomorrow's time (1d = 86,400,000ms)
        setTimeout(DailyTasks.run, scheduleToday < 0 ? scheduleToday + 86_400_000 : scheduleToday);
    }
}

export const event: Event = {
    name: Events.ClientReady,
    callback: () => {
        if (!client.user) return console.error('Failed to login.');
        console.log(`Logged in as ${client.user.tag} (${client.user.id}).`);

        console.log('Checking availability of specified guild...');
        getGuild();

        timeoutStore.load(false);

        DailyTasks.schedule();
        StickyThread.checkAllStickyThreads();
    },
};
