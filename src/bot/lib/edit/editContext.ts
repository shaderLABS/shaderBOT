import { Snowflake } from 'discord.js';
import { db } from '../../../db/postgres.js';
import log from '../log.js';
import { parseUser } from '../misc.js';

export async function editContext(uuid: string, context: string, modID: Snowflake, table: 'warn' | 'punishment' | 'past_punishment' | 'note') {
    const tableToString = {
        warn: 'warning',
        punishment: 'punishment',
        past_punishment: 'past punishment',
        note: 'note',
    };

    const result = (
        await db.query(
            /*sql*/ `
            UPDATE ${table}
            SET context_url = $1, edited_timestamp = $2, edited_mod_id = $3
            FROM ${table} old_table
            WHERE ${table}.id = $4 AND old_table.id = ${table}.id
            RETURNING ${table}.user_id::TEXT, old_table.context_url AS old_context;`,
            [context, new Date(), modID, uuid]
        )
    ).rows[0];

    if (!result) return Promise.reject('There is no entry with the specified UUID.');
    const tableString = tableToString[table];

    log(`${parseUser(modID)} edited the context of ${parseUser(result.user_id)}'s ${tableString} (${uuid}) from:\n\n${result.old_context}\n\nto:\n\n${context}`, 'Edit Context');
    return { ...result, tableString };
}
