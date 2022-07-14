import { client } from '../bot.js';
import { Event } from '../eventHandler.js';
import { cleanBackups } from '../lib/backup.js';
import { rotateBanner } from '../lib/banner.js';
import { setRandomPresence } from '../lib/presence.js';
import { StickyThread } from '../lib/stickyThread.js';
import { loadTimeouts } from '../lib/timeoutStore.js';

function runDailyTasks() {
    cleanBackups();
    rotateBanner();

    loadTimeouts(true);
    setRandomPresence();

    scheduleDailyTasks();
}

function scheduleDailyTasks() {
    const date = new Date();
    const scheduleToday = -date.getTime() + date.setHours(23, 59, 0, 0);

    // if today's time has passed, use tomorrow's time (1d = 86400000ms)
    setTimeout(runDailyTasks, scheduleToday < 0 ? scheduleToday + 86400000 : scheduleToday);
}

export const event: Event = {
    name: 'ready',
    callback: () => {
        if (!client.user) return console.error('Failed to login.');
        console.log(`Logged in as ${client.user.tag} (${client.user.id}).`);

        loadTimeouts(false);
        setRandomPresence();

        scheduleDailyTasks();
        StickyThread.checkAllStickyThreads();
    },
};
