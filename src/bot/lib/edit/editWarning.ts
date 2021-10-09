import { Snowflake } from 'discord.js';
import { db } from '../../../db/postgres.js';
import log from '../log.js';
import { parseUser } from '../misc.js';

export async function editWarnReason(reason: string, id: string, modID: Snowflake) {
    const warning = (
        await db.query(
            /*sql*/ `
            UPDATE warn
            SET reason = $1, edited_mod_id = $2, edited_timestamp = $3
            FROM warn old_warn
            WHERE warn.id = $4 AND old_warn.id = warn.id
            RETURNING old_warn.reason AS old_reason, warn.user_id;`,
            [reason, modID, new Date(), id]
        )
    ).rows[0];

    if (!warning) return Promise.reject('There is no warning with the specified UUID.');

    log(`${parseUser(modID)} edited the reason of ${parseUser(warning.user_id)}'s warning (${id}) from:\n\n${warning.old_reason}\n\nto:\n\n${reason}`, 'Edit Warning Reason');
    return warning;
}

export async function editWarnSeverity(severity: number, id: string, modID: Snowflake) {
    const warning = (
        await db.query(
            /*sql*/ `
            SELECT severity, user_id::TEXT
            FROM warn
            WHERE id = $1`,
            [id]
        )
    ).rows[0];

    if (!warning) return Promise.reject('There is no warning with the specified UUID.');
    if (warning.severity === severity) return Promise.reject(`The warning already has a severity of ${severity}.`);

    await db.query(
        /*sql*/ `
        UPDATE warn
        SET severity = $1, edited_timestamp = $2, edited_mod_id = $3
        WHERE id = $4`,
        [severity, new Date(), modID, id]
    );

    log(`${parseUser(modID)} edited the severity of ${parseUser(warning.user_id)}'s warning (${id}) from ${warning.severity} to ${severity}.`, 'Edit Warning Severity');
    return warning.user_id;
}
