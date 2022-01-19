import { Snowflake } from 'discord-api-types';
import { db } from '../../../db/postgres.js';
import log from '../log.js';
import { parseUser } from '../misc.js';

export async function editAppealReason(reason: string, id: string, modID: Snowflake) {
    const appeal = (
        await db.query(
            /*sql*/ `
            SELECT result_reason, user_id::TEXT
            FROM appeal
            WHERE id = $1`,
            [id]
        )
    ).rows[0];

    if (!appeal) return Promise.reject('There is no warning with the specified UUID.');

    await db.query(
        /*sql*/ `
        UPDATE appeal
        SET result_reason = $1, result_edit_timestamp = $2, result_edit_mod_id = $3
        WHERE id = $4`,
        [reason, new Date(), modID, id]
    );

    log(
        `${parseUser(modID)} edited the reason of ${parseUser(appeal.user_id)}'s ban appeal (${id}) from:\n\n${appeal.result_reason || 'No reason provided.'}\n\nto:\n\n${
            reason || 'No reason provided.'
        }.`,
        'Edit Ban Appeal Reason'
    );
    return appeal.user_id;
}
