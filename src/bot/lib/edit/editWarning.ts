import { db } from '../../../db/postgres.js';
import log from '../log.js';

export async function editWarnReason(reason: string, id: string, modID: string) {
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

    log(`<@${modID}> edited the reason of <@${warning.user_id}>'s warning (${id}) from:\n\n${warning.old_reason}\n\nto:\n\n${reason}`);
    return warning;
}

export async function editWarnSeverity(severity: number, id: string, modID: string) {
    const warning = (
        await db.query(
            /*sql*/ `
            SELECT expire_days, severity, timestamp::TEXT, user_id::TEXT
            FROM warn
            WHERE id = $1`,
            [id]
        )
    ).rows[0];

    if (!warning) return Promise.reject('There is no warning with the specified UUID.');
    if (warning.severity === severity) return Promise.reject('The warning already has the specified severity.');

    const warningCount = await db.query(
        /*sql*/ `
        SELECT COUNT(id)
        FROM warn
        WHERE user_id = $1 AND timestamp < $2 AND (timestamp + INTERVAL '1 day' * expire_days) > $2
        GROUP BY severity
        ORDER BY severity;`,
        [warning.user_id, warning.timestamp]
    );

    let normalWarnings = +warningCount.rows[0]?.count || 0;
    let severeWarnings = +warningCount.rows[1]?.count || 0;

    severity === 0 ? normalWarnings++ : severeWarnings++;
    const expire_days = 14 * normalWarnings + 60 * severeWarnings;

    const expired = new Date(warning.timestamp).getTime() + expire_days * 86400000 < new Date().getTime();
    const expires_in = Math.ceil((new Date(warning.timestamp).getTime() + expire_days * 86400000 - new Date().getTime()) / 86400000);

    await db.query(
        /*sql*/ `
        UPDATE warn
        SET severity = $1, expire_days = $2, expired = $3, edited_timestamp = $4, edited_mod_id = $5
        WHERE id = $6`,
        [severity, expire_days, expired, new Date(), modID, id]
    );

    log(
        `<@${modID}> edited the severity of <@${warning.user_id}>'s warning (${id}) from ${severity === 0 ? '"severe" to "normal"' : '"normal" to "severe"'}. ${
            expired ? 'The warning is expired.' : `The warning will expire in ${expires_in} days.`
        }`
    );
    return { expired, expires_in, user_id: warning.user_id };
}
