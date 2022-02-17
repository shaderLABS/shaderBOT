import { Snowflake } from 'discord.js';
import { db } from '../../../db/postgres.js';
import log from '../log.js';
import { getGuild, parseUser } from '../misc.js';
import { expireMute } from '../muteUser.js';
import { store } from '../punishments.js';
import { formatTimeDate } from '../time.js';

export async function editMuteReason(uuid: string, reason: string, modID: Snowflake, past_table: boolean) {
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

    log(`${parseUser(modID)} edited the reason of ${parseUser(result.user_id)}'s mute (${uuid}) from:\n\n${result.old_reason}\n\nto:\n\n${reason}`, 'Edit Mute Reason');
    return result;
}

export async function editMuteDuration(uuid: string, time: number, modID: Snowflake) {
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

    const expireDate = new Date(result.expire_timestamp);
    const expireTime = expireDate.getTime();
    const editTime = editTimestamp.getTime();

    if (member) member.disableCommunicationUntil(expireDate);

    if (expireTime < editTimestamp.setHours(24, 0, 0, 0)) {
        const timeout = setTimeout(() => expireMute(result.user_id), expireTime - editTime);

        const previousTimeout = store.mutes.get(result.user_id);
        if (previousTimeout) clearTimeout(previousTimeout);

        store.mutes.set(result.user_id, timeout);
    }

    log(
        `${parseUser(modID)} edited the expiry date of ${parseUser(result.user_id)}'s mute (${uuid}) from ${formatTimeDate(new Date(result.old_expire_timestamp))} to ${formatTimeDate(expireDate)}.`,
        'Edit Mute Duration'
    );
    return result;
}
