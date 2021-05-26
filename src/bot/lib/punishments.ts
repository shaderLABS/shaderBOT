import { db } from '../../db/postgres.js';
import { client } from '../bot.js';
import { unban } from './banUser.js';
import { getGuild } from './misc.js';
import { unmute } from './muteUser.js';

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

export async function loadTimeouts() {
    if (!client.user) return Promise.reject('The client is not logged in.');
    console.log('Loading punishments...');

    const expiringPunishments = (
        await db.query(/*sql*/ `
            SELECT user_id::TEXT, "type", mod_id::TEXT, expire_timestamp::TEXT
            FROM punishment
            WHERE (("type" = 'ban' AND expire_timestamp IS NOT NULL) OR "type" = 'mute') AND expire_timestamp <= NOW()::DATE + INTERVAL '1 day 5 minutes';`)
    ).rows;

    for (const punishment of expiringPunishments) {
        const ms = new Date(punishment.expire_timestamp).getTime() - Date.now();

        if (ms <= 5000) {
            if (punishment.type === 'ban') {
                unban(punishment.user_id);
            } else {
                const member = await getGuild()
                    ?.members.fetch(punishment.user_id)
                    .catch(() => undefined);
                unmute(punishment.user_id, undefined, member);
            }
        } else {
            if (punishment.type === 'ban') {
                const timeout = setTimeout(() => {
                    unban(punishment.user_id);
                }, ms);

                const previousTimeout = store.tempbans.get(punishment.user_id);
                if (previousTimeout) clearTimeout(previousTimeout);

                store.tempbans.set(punishment.user_id, timeout);
            } else {
                const timeout = setTimeout(async () => {
                    const timeoutMember = await getGuild()
                        ?.members.fetch(punishment.user_id)
                        .catch(() => undefined);
                    unmute(punishment.user_id, undefined, timeoutMember);
                }, ms);

                const previousTimeout = store.mutes.get(punishment.user_id);
                if (previousTimeout) clearTimeout(previousTimeout);

                store.mutes.set(punishment.user_id, timeout);
            }
        }
    }
}
