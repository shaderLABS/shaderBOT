import uuid from 'uuid-random';
import { db } from '../../db/postgres.js';
import { Command } from '../commandHandler.js';
import { sendError, sendSuccess } from '../lib/embeds.js';
import log from '../lib/log.js';
import { punishmentTypeAsString } from '../lib/punishments.js';
import { getUser } from '../lib/searchMessage.js';
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
            const id = uuid.test(text) ? text : (await db.query(/*sql*/ `SELECT id FROM past_punishment WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 1;`, [(await getUser(text)).id])).rows[0]?.id;
            if (!id) return sendError(channel, 'The specified user does not have any log entries of past panishments.');

            const deletedEntry = (
                await db.query(
                    /*sql*/ `
                    DELETE FROM past_punishment
                    WHERE id = $1
                    RETURNING user_id, type, reason, mod_id, timestamp, edited_timestamp, lifted_timestamp, lifted_mod_id;`,
                    [id]
                )
            ).rows[0];
            if (!deletedEntry) return sendError(channel, 'The specified log entry could not be resolved.');

            let content = `**User:** <@${deletedEntry.user_id}>
                **Type:** ${punishmentTypeAsString[deletedEntry.type]}
                **Reason:** ${deletedEntry.reason || 'No reason provided.'}
                **Moderator:** ${deletedEntry.mod_id ? `<@${deletedEntry.mod_id}>` : 'System'}
                **ID:** ${text}
                **Created At:** ${formatTimeDate(new Date(deletedEntry.timestamp))}`;

            if (deletedEntry.lifted_timestamp) content += `\n**Lifted At:** ${formatTimeDate(new Date(deletedEntry.lifted_timestamp))}`;
            if (deletedEntry.lifted_mod_id) content += `\n**Lifted By:** <@${deletedEntry.lifted_mod_id}>`;
            if (deletedEntry.edited_timestamp) content += `\n*(last edited by <@${deletedEntry.edited_mod_id}> at ${formatTimeDate(new Date(deletedEntry.edited_timestamp))})*`;

            sendSuccess(channel, `Successfully deleted the past punishment entry \`${id}\`.`);
            log(`<@${message.author.id}> deleted a past punishment entry:\n\n${content}`);
        } catch (error) {
            sendError(channel, error);
        }
    },
};
