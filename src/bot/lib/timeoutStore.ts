import { client } from '../bot.js';
import { ChannelLock } from './channelRestriction/lock.js';
import { ChannelSlowmode } from './channelRestriction/slowmode.js';
import { Ban } from './punishment/ban.js';
import { Mute } from './punishment/mute.js';

export interface TimeoutEntry {
    id: string;
    expireTimestamp?: Date;

    refresh(): Promise<TimeoutEntry>;
    expire(): Promise<void>;
}

export class TimeoutStore {
    private entries = new Map<string, NodeJS.Timeout>();

    public set(entry: TimeoutEntry, onlyExpiringToday: boolean) {
        if (!entry.expireTimestamp || (onlyExpiringToday && entry.expireTimestamp.getTime() > new Date().setHours(24, 0, 0, 0))) return;

        const timeout = setTimeout(async () => {
            entry = await entry.refresh();
            await entry.expire();
            this.entries.delete(entry.id);
        }, entry.expireTimestamp.getTime() - Date.now());

        const previousTimeout = this.entries.get(entry.id);
        if (previousTimeout) clearTimeout(previousTimeout);
        this.entries.set(entry.id, timeout);
    }

    public delete(entry: TimeoutEntry) {
        const timeout = this.entries.get(entry.id);
        if (timeout) {
            clearTimeout(timeout);
            this.entries.delete(entry.id);
        }
    }

    public load(includeTomorrow: boolean) {
        if (!client.user) throw 'The client is not logged in.';

        console.log('Loading expiring bans...');
        const expiringBans = includeTomorrow ? Ban.getExpiringTomorrow() : Ban.getExpiringToday();
        expiringBans.then((bans) => bans.forEach((ban) => this.set(ban, false)));

        console.log('Loading expiring mutes...');
        const expiringMutes = includeTomorrow ? Mute.getExpiringTomorrow() : Mute.getExpiringToday();
        expiringMutes.then((mutes) => mutes.forEach((mute) => this.set(mute, false)));

        console.log('Loading expiring channel locks...');
        const expiringLocks = includeTomorrow ? ChannelLock.getExpiringTomorrow() : ChannelLock.getExpiringToday();
        expiringLocks.then((locks) => locks.forEach((lock) => this.set(lock, false)));

        console.log('Loading expiring channel slowmodes...');
        const expiringSlowmodes = includeTomorrow ? ChannelSlowmode.getExpiringTomorrow() : ChannelSlowmode.getExpiringToday();
        expiringSlowmodes.then((slowmodes) => slowmodes.forEach((slowmode) => this.set(slowmode, false)));
    }
}
