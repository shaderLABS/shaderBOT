import { db } from '../../../db/postgres.js';
import { unban } from '../banUser.js';
import log from '../log.js';
import { formatTimeDate } from '../misc.js';
import { store } from '../punishments.js';

export async function editBanReason(uuid: string, reason: string, modID: string, past_table: boolean) {
    const table = past_table ? 'past_punishment' : 'punishment';

    const result = (
        await db.query(
            /*sql*/ `
            UPDATE ${table}
            SET reason = $1, edited_timestamp = $2, edited_mod_id = $3
            FROM ${table} old_table
            WHERE ${table}.id = $4 AND ${table}.type = 'ban' AND old_table.id = ${table}.id
            RETURNING ${table}.user_id::TEXT, old_table.reason AS old_reason;`,
            [reason, new Date(), modID, uuid]
        )
    ).rows[0];

    if (!result) return Promise.reject('There is no ban with the specified UUID.');

    log(`<@${modID}> edited the reason of <@${result.user_id}>'s ban (${uuid}) from:\n\n${result.old_reason}\n\nto:\n\n${reason}`);
    return result;
}

export async function editBanDuration(uuid: string, time: number, modID: string) {
    const editTimestamp = new Date();

    const result = (
        await db.query(
            /*sql*/ `
            UPDATE punishment
            SET expire_timestamp = punishment.timestamp + interval '1 second' * $1, edited_timestamp = $2, edited_mod_id = $3
            FROM punishment old_table
            WHERE punishment.id = $4 AND punishment.type = 'ban' AND old_table.id = punishment.id
            RETURNING punishment.user_id::TEXT, old_table.expire_timestamp AS old_expire_timestamp, punishment.expire_timestamp;`,
            [time, editTimestamp, modID, uuid]
        )
    ).rows[0];

    if (!result) return Promise.reject('There is no active ban with the specified UUID.');

    const expireTime = new Date(result.expire_timestamp).getTime();
    const editTime = editTimestamp.getTime();

    if (expireTime < editTime) {
        unban(result.user_id).catch(() => undefined);
    } else if (expireTime < editTimestamp.setHours(23, 55, 0, 0)) {
        const timeout = setTimeout(() => {
            unban(result.user_id).catch(() => undefined);
        }, expireTime - editTime);

        const previousTimeout = store.tempbans.get(result.user_id);
        if (previousTimeout) clearTimeout(previousTimeout);

        store.tempbans.set(result.user_id, timeout);
    }

    log(
        `<@${modID}> edited the expiry date of <@${result.user_id}>'s ban (${uuid}) from ${formatTimeDate(new Date(result.old_expire_timestamp))} to ${formatTimeDate(
            new Date(result.expire_timestamp)
        )}.`
    );
    return result;
}
