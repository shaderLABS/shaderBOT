import { ActivityType, Client, type PresenceData } from 'discord.js';
import { settings } from '../bot.ts';

export abstract class RandomPresence {
    public static get PRESENCE(): PresenceData {
        if (settings.data.randomCustomStatuses.length == 0) return { activities: [] };
        return { activities: [{ type: ActivityType.Custom, name: settings.data.randomCustomStatuses[Math.floor(Math.random() * settings.data.randomCustomStatuses.length)] }] };
    }

    public static set(client: Client) {
        client.user?.presence.set(RandomPresence.PRESENCE);
    }
}
