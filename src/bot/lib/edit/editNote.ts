import { Snowflake } from 'discord.js';
import { db } from '../../../db/postgres.js';
import log from '../log.js';
import { parseUser } from '../misc.js';

export async function editNote(uuid: string, content: string, modID: Snowflake) {
    const result = (
        await db.query(
            /*sql*/ `
            UPDATE note
            SET content = $1, edited_timestamp = $2, edited_mod_id = $3
            FROM note old_note
            WHERE note.id = $4 AND old_note.id = note.id
            RETURNING note.user_id::TEXT, old_note.content AS old_content;`,
            [content, new Date(), modID, uuid]
        )
    ).rows[0];

    if (!result) return Promise.reject('There is no note with the specified UUID.');

    log(`${parseUser(modID)} edited the content of ${parseUser(result.user_id)}'s note (${uuid}) from:\n\n${result.old_content}\n\nto:\n\n${content}`, 'Edit Note');
    return result;
}
