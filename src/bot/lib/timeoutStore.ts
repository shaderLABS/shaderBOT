import { client } from '../bot.js';
import { LockSlowmode } from './lockSlowmode.js';
import { Punishment } from './punishment.js';

export class TimeoutStore {
    private mutes = new Map<string, NodeJS.Timeout>();
    private bans = new Map<string, NodeJS.Timeout>();

    private locks = new Map<string, NodeJS.Timeout>();
    private slowmodes = new Map<string, NodeJS.Timeout>();

    public set(entry: Punishment | LockSlowmode, onlyExpiringToday: boolean) {
        if (!entry.expireTimestamp || (onlyExpiringToday && entry.expireTimestamp.getTime() > new Date().setHours(24, 0, 0, 0))) return;

        if (entry instanceof Punishment) {
            const timeout = setTimeout(async () => {
                (await Punishment.getByUUID(entry.id, entry.type)).expire();

                if (entry.type === 'ban') this.bans.delete(entry.userID);
                else this.mutes.delete(entry.userID);
            }, entry.expireTimestamp.getTime() - Date.now());

            if (entry.type === 'ban') {
                const previousTimeout = this.bans.get(entry.userID);
                if (previousTimeout) clearTimeout(previousTimeout);
                this.bans.set(entry.userID, timeout);
            } else {
                const previousTimeout = this.mutes.get(entry.userID);
                if (previousTimeout) clearTimeout(previousTimeout);
                this.mutes.set(entry.userID, timeout);
            }
        } else if (entry instanceof LockSlowmode) {
            const timeout = setTimeout(async () => {
                entry.expire();

                if (entry.type === 'lock') this.locks.delete(entry.channelID);
                else this.slowmodes.delete(entry.channelID);
            }, entry.expireTimestamp.getTime() - Date.now());

            if (entry.type === 'lock') {
                const previousTimeout = this.locks.get(entry.channelID);
                if (previousTimeout) clearTimeout(previousTimeout);
                this.locks.set(entry.channelID, timeout);
            } else {
                const previousTimeout = this.slowmodes.get(entry.channelID);
                if (previousTimeout) clearTimeout(previousTimeout);
                this.slowmodes.set(entry.channelID, timeout);
            }
        }
    }

    public delete(entry: Punishment | LockSlowmode) {
        if (entry.type === 'ban') {
            const timeout = this.bans.get(entry.userID);
            if (timeout) {
                clearTimeout(timeout);
                this.bans.delete(entry.userID);
            }
        } else if (entry.type === 'mute') {
            const timeout = this.mutes.get(entry.userID);
            if (timeout) {
                clearTimeout(timeout);
                this.mutes.delete(entry.userID);
            }
        } else if (entry.type === 'lock') {
            const timeout = this.locks.get(entry.channelID);
            if (timeout) {
                clearTimeout(timeout);
                this.locks.delete(entry.channelID);
            }
        } else if (entry.type === 'slowmode') {
            const timeout = this.slowmodes.get(entry.channelID);
            if (timeout) {
                clearTimeout(timeout);
                this.slowmodes.delete(entry.channelID);
            }
        }
    }

    public load(includeTomorrow: boolean) {
        if (!client.user) throw 'The client is not logged in.';

        console.log('Loading expiring punishments...');
        const expiringPunishments = includeTomorrow ? Punishment.getExpiringTomorrow() : Punishment.getExpiringToday();
        expiringPunishments.then((punishments) => punishments.forEach((punishment) => this.set(punishment, false)));

        console.log('Loading expiring locks and slowmodes...');
        const expiringLockSlowmodes = includeTomorrow ? LockSlowmode.getExpiringTomorrow() : LockSlowmode.getExpiringToday();
        expiringLockSlowmodes.then((lockSlowmodes) => lockSlowmodes.forEach((lockSlowmode) => this.set(lockSlowmode, false)));
    }
}
