import { db } from '../../../db/postgres.js';
import log from '../log.js';
import { parseUser } from '../misc.js';

export async function editKick(uuid: string, reason: string, modID: string) {
    const result = (
        await db.query(
            /*sql*/ `
            UPDATE past_punishment
            SET reason = $1, edited_timestamp = $2, edited_mod_id = $3
            FROM past_punishment old_past_punishment
            WHERE past_punishment.id = $4 AND past_punishment.type = 'kick' AND old_past_punishment.id = past_punishment.id
            RETURNING past_punishment.user_id::TEXT, old_past_punishment.reason AS old_reason;`,
            [reason, new Date(), modID, uuid]
        )
    ).rows[0];

    if (!result) return Promise.reject('There is no kick with the specified UUID.');

    log(`${parseUser(modID)} edited the reason of ${parseUser(result.user_id)}'s kick (${uuid}) from:\n\n${result.old_reason}\n\nto:\n\n${reason}`);
    return result;
}
