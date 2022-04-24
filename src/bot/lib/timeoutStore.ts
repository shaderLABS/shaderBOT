import { client, timeoutStore } from '../bot.js';
import { Punishment } from './punishment.js';

export class TimeoutStore {
    private mutes: Map<string, NodeJS.Timeout> = new Map();
    private bans: Map<string, NodeJS.Timeout> = new Map();

    public set(punishment: Punishment) {
        if (!punishment.expireTimestamp) return;

        if (punishment.expireTimestamp.getTime() < new Date().setHours(24, 0, 0, 0)) {
            const timeout = setTimeout(async () => (await Punishment.getByUUID(punishment.id, punishment.type)).expire(), punishment.expireTimestamp.getTime() - Date.now());

            if (punishment.type === 'ban') {
                const previousTimeout = this.bans.get(punishment.userID);
                if (previousTimeout) clearTimeout(previousTimeout);
                this.bans.set(punishment.userID, timeout);
            } else {
                const previousTimeout = this.mutes.get(punishment.userID);
                if (previousTimeout) clearTimeout(previousTimeout);
                this.mutes.set(punishment.userID, timeout);
            }
        }
    }

    public delete(punishment: Punishment) {
        if (punishment.type === 'ban') {
            const timeout = this.bans.get(punishment.userID);
            if (timeout) {
                clearTimeout(timeout);
                this.bans.delete(punishment.userID);
            }
        } else {
            const timeout = this.mutes.get(punishment.userID);
            if (timeout) {
                clearTimeout(timeout);
                this.mutes.delete(punishment.userID);
            }
        }
    }
}

export async function loadTimeouts(includeTomorrow: boolean) {
    if (!client.user) return Promise.reject('The client is not logged in.');
    console.log('Loading punishments...');

    const expiringPunishments = includeTomorrow ? await Punishment.getExpiringTomorrow() : await Punishment.getExpiringToday();
    expiringPunishments.forEach((punishment) => timeoutStore.set(punishment));
}
