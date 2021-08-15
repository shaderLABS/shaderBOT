import uuid from 'uuid-random';
import { db } from '../../db/postgres.js';
import { Command } from '../commandHandler.js';
import { sendError, sendSuccess } from '../lib/embeds.js';
import log from '../lib/log.js';
import { formatContextURL, parseUser } from '../lib/misc.js';
import { punishmentTypeAsString } from '../lib/punishments.js';
import { requireUser } from '../lib/searchMessage.js';
import { formatTimeDate } from '../lib/time.js';

export const command: Command = {
    commands: ['deletelog', 'dellog'],
    help: 'Delete the log entry of a (past) punishment.',
    minArgs: 1,
    maxArgs: null,
    expectedArgs: '<uuid|<@user|userID|username>>',
    requiredPermissions: ['BAN_MEMBERS'],
    callback: async (message, _, text) => {
        const { channel } = message;

        try {
            const id = uuid.test(text)
                ? text
                : (await db.query(/*sql*/ `SELECT id FROM past_punishment WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 1;`, [(await requireUser(text, { author: message.author, channel })).id]))
                      .rows[0]?.id;

            if (!id) return sendError(channel, 'The specified user does not have any log entries of past panishments.');

            const deletedEntry = (
                await db.query(
                    /*sql*/ `
                    DELETE FROM past_punishment
                    WHERE id = $1
                    RETURNING user_id, type, reason, context_url, mod_id, timestamp, edited_timestamp, lifted_timestamp, lifted_mod_id;`,
                    [id]
                )
            ).rows[0];
            if (!deletedEntry) return sendError(channel, 'The specified log entry could not be resolved.');

            let content =
                `**User:** ${parseUser(deletedEntry.user_id)}` +
                `\n**Type:** ${punishmentTypeAsString[deletedEntry.type]}` +
                `\n**Reason:** ${deletedEntry.reason || 'No reason provided.'}` +
                `\n**Moderator:** ${deletedEntry.mod_id ? parseUser(deletedEntry.mod_id) : 'System'}` +
                `\n**Context:** ${formatContextURL(deletedEntry.context_url)}` +
                `\n**ID:** ${id}` +
                `\n**Created At:** ${formatTimeDate(new Date(deletedEntry.timestamp))}`;

            if (deletedEntry.lifted_timestamp) content += `\n**Lifted At:** ${formatTimeDate(new Date(deletedEntry.lifted_timestamp))}`;
            if (deletedEntry.lifted_mod_id) content += `\n**Lifted By:** ${parseUser(deletedEntry.lifted_mod_id)}`;
            if (deletedEntry.edited_timestamp) content += `\n*(last edited by ${parseUser(deletedEntry.edited_mod_id)} at ${formatTimeDate(new Date(deletedEntry.edited_timestamp))})*`;

            sendSuccess(channel, `Successfully deleted the past punishment entry \`${id}\`.`, 'Delete Log Entry');
            log(`${parseUser(message.author)} deleted a past punishment entry:\n\n${content}`, 'Delete Log Entry');
        } catch (error) {
            if (error) sendError(channel, error);
        }
    },
};
