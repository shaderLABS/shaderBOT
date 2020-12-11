import { db } from '../../../db/postgres.js';
import log from '../log.js';

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

    log(`<@${modID}> edited the reason of <@${result.user_id}>'s mute (${uuid}) from:\n\n${result.old_reason}\n\nto:\n\n${reason}`);
    return result;
}
