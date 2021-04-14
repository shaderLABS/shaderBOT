import { db } from '../../../db/postgres.js';
import log from '../log.js';
import { getGuild, parseUser } from '../misc.js';
import { unmute } from '../muteUser.js';
import { store } from '../punishments.js';
import { formatTimeDate } from '../time.js';

export async function editMuteReason(uuid: string, reason: string, modID: string, past_table: boolean) {
    const table = past_table ? 'past_punishment' : 'punishment';

    const result = (
        await db.query(
            /*sql*/ `
            UPDATE ${table}
            SET reason = $1, edited_timestamp = $2, edited_mod_id = $3
            FROM ${table} old_table
            WHERE ${table}.id = $4 AND ${table}.type = 'mute' AND old_table.id = ${table}.id
            RETURNING ${table}.user_id::TEXT, old_table.reason AS old_reason;`,
            [reason, new Date(), modID, uuid]
        )
    ).rows[0];

    if (!result) return Promise.reject('There is no mute with the specified UUID.');

    log(`${parseUser(modID)} edited the reason of ${parseUser(result.user_id)}'s mute (${uuid}) from:\n\n${result.old_reason}\n\nto:\n\n${reason}`);
    return result;
}

export async function editMuteDuration(uuid: string, time: number, modID: string) {
    const editTimestamp = new Date();

    const result = (
        await db.query(
            /*sql*/ `
            UPDATE punishment
            SET expire_timestamp = punishment.timestamp + interval '1 second' * $1, edited_timestamp = $2, edited_mod_id = $3
            FROM punishment old_table
            WHERE punishment.id = $4 AND punishment.type = 'mute' AND old_table.id = punishment.id
            RETURNING punishment.user_id::TEXT, old_table.expire_timestamp AS old_expire_timestamp, punishment.expire_timestamp;`,
            [time, editTimestamp, modID, uuid]
        )
    ).rows[0];

    if (!result) return Promise.reject('There is no active mute with the specified UUID.');

    const guild = getGuild();
    const member = guild?.members.cache.get(result.user_id) || (await guild?.members.fetch(result.user_id).catch(() => undefined));

    const expireTime = new Date(result.expire_timestamp).getTime();
    const editTime = editTimestamp.getTime();

    if (member) {
        if (expireTime < editTime) {
            unmute(member.id, undefined, member).catch(() => undefined);
        } else if (expireTime < editTimestamp.setHours(23, 55, 0, 0)) {
            const timeout = setTimeout(async () => {
                const timeoutMember = await getGuild()
                    ?.members.fetch(member.id)
                    .catch(() => undefined);
                unmute(member.id, undefined, timeoutMember);
            }, expireTime - editTime);

            const previousTimeout = store.mutes.get(member.id);
            if (previousTimeout) clearTimeout(previousTimeout);

            store.mutes.set(member.id, timeout);
        }
    }

    log(
        `${parseUser(modID)} edited the expiry date of ${parseUser(result.user_id)}'s mute (${uuid}) from ${formatTimeDate(new Date(result.old_expire_timestamp))} to ${formatTimeDate(
            new Date(result.expire_timestamp)
        )}.`
    );
    return result;
}
