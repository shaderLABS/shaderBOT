import { db } from '../../../db/postgres.js';
import { GuildCommandInteraction } from '../../events/interactionCreate.js';
import { replyError, replySuccess } from '../../lib/embeds.js';
import log from '../../lib/log.js';
import { formatContextURL, parseUser } from '../../lib/misc.js';
import { punishmentTypeAsString } from '../../lib/punishments.js';
import { formatTimeDate } from '../../lib/time.js';

export async function deleteLogEntry(id: string, interaction: GuildCommandInteraction) {
    const deletedEntry = (
        await db.query(
            /*sql*/ `
            DELETE FROM past_punishment
            WHERE id = $1
            RETURNING user_id, type, reason, context_url, mod_id, timestamp, edited_timestamp, edited_mod_id, lifted_timestamp, lifted_mod_id;`,
            [id]
        )
    ).rows[0];
    if (!deletedEntry) return replyError(interaction, 'The specified log entry could not be deleted.');

    let content =
        `**User:** ${parseUser(deletedEntry.user_id)}` +
        `\n**Type:** ${punishmentTypeAsString[deletedEntry.type]}` +
        `\n**Reason:** ${deletedEntry.reason}` +
        `\n**Moderator:** ${deletedEntry.mod_id ? parseUser(deletedEntry.mod_id) : 'System'}` +
        `\n**Context:** ${formatContextURL(deletedEntry.context_url)}` +
        `\n**ID:** ${id}` +
        `\n**Created At:** ${formatTimeDate(new Date(deletedEntry.timestamp))}`;

    if (deletedEntry.lifted_timestamp) content += `\n**Lifted At:** ${formatTimeDate(new Date(deletedEntry.lifted_timestamp))}`;
    if (deletedEntry.lifted_mod_id) content += `\n**Lifted By:** ${parseUser(deletedEntry.lifted_mod_id)}`;
    if (deletedEntry.edited_timestamp) content += `\n*(last edited by ${parseUser(deletedEntry.edited_mod_id)} at ${formatTimeDate(new Date(deletedEntry.edited_timestamp))})*`;

    replySuccess(interaction, `Successfully deleted the past punishment entry \`${id}\`.`, 'Delete Log Entry');
    log(`${parseUser(interaction.user)} deleted a past punishment entry:\n\n${content}`, 'Delete Log Entry');
}
