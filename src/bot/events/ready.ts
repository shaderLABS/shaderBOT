import { Events } from 'discord.js';
import { client, timeoutStore } from '../bot.ts';
import type { Event } from '../eventHandler.ts';
import { Backup } from '../lib/backup.ts';
import { rotateBanner } from '../lib/banner.ts';
import { getGuild } from '../lib/misc.ts';
import { RandomPresence } from '../lib/presence.ts';
import { StickyThread } from '../lib/stickyThread.ts';

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

        console.log('Fetching members of specified guild...');
        getGuild().members.fetch();

        timeoutStore.load(false);

        DailyTasks.schedule();
        StickyThread.checkAllStickyThreads();
    },
};
