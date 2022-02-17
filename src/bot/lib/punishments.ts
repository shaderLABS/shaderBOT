import { db } from '../../db/postgres.js';
import { client } from '../bot.js';
import { unban } from './banUser.js';
import log from './log.js';
import { formatContextURL, parseUser } from './misc.js';
import { expireMute } from './muteUser.js';
import { formatTimeDate } from './time.js';

export const punishmentTypeAsString: {
    [key: string]: string;
} = {
    kick: 'Kick',
    ban: 'Ban',
    mute: 'Mute',
};

let store: {
    mutes: Map<string, NodeJS.Timeout>;
    tempbans: Map<string, NodeJS.Timeout>;
} = {
    mutes: new Map(),
    tempbans: new Map(),
};

export { store };

export async function loadTimeouts(includeTomorrow: boolean) {
    if (!client.user) return Promise.reject('The client is not logged in.');
    console.log('Loading punishments...');

    const expiringPunishments = (
        await db.query(/*sql*/ `
            SELECT user_id::TEXT, "type", mod_id::TEXT, expire_timestamp::TEXT
            FROM punishment
            WHERE (("type" = 'ban' AND expire_timestamp IS NOT NULL) OR "type" = 'mute') AND expire_timestamp::DATE <= NOW()::DATE ${includeTomorrow ? `+ INTERVAL '1 day'` : ''};`)
    ).rows;

    for (const punishment of expiringPunishments) {
        const ms = new Date(punishment.expire_timestamp).getTime() - Date.now();

        if (punishment.type === 'ban') {
            const timeout = setTimeout(() => {
                unban(punishment.user_id).catch((e) => log(`Failed to unban ${parseUser(punishment.user_id)}: ${e}`, 'Unban'));
            }, ms);

            const previousTimeout = store.tempbans.get(punishment.user_id);
            if (previousTimeout) clearTimeout(previousTimeout);

            store.tempbans.set(punishment.user_id, timeout);
        } else {
            const timeout = setTimeout(() => expireMute(punishment.user_id), ms);

            const previousTimeout = store.mutes.get(punishment.user_id);
            if (previousTimeout) clearTimeout(previousTimeout);

            store.mutes.set(punishment.user_id, timeout);
        }
    }
}

export function punishmentToString(punishment: any) {
    return (
        `**Reason:** ${punishment.reason}` +
        `\n**Moderator:** ${punishment.mod_id ? parseUser(punishment.mod_id) : 'System'}` +
        `\n**Context:** ${formatContextURL(punishment.context_url)}` +
        `\n**ID:** ${punishment.id}` +
        `\n**Created At:** ${formatTimeDate(new Date(punishment.timestamp))}` +
        `\n**Expiring At:** ${punishment.expire_timestamp ? formatTimeDate(new Date(punishment.expire_timestamp)) : 'Permanent'}`
    );
}

export function pastPunishmentToString(punishment: any) {
    return (
        `**Reason:** ${punishment.reason}` +
        `\n**Moderator:** ${punishment.mod_id ? parseUser(punishment.mod_id) : 'System'}` +
        `\n**Context:** ${formatContextURL(punishment.context_url)}` +
        `\n**ID:** ${punishment.id}` +
        `\n**Created At:** ${formatTimeDate(new Date(punishment.timestamp))}`
    );
}
