import uuid from 'uuid-random';
import { db } from '../../../../db/postgres.js';
import { GuildCommandInteraction } from '../../../events/interactionCreate.js';
import { replyError, replyInfo } from '../../../lib/embeds.js';
import { formatContextURL, parseUser } from '../../../lib/misc.js';
import { formatTimeDate } from '../../../lib/time.js';
import { ApplicationCommandCallback } from '../../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: ['KICK_MEMBERS'],
    callback: async (interaction: GuildCommandInteraction) => {
        const id = interaction.options.getString('id', true);
        if (!uuid.test(id)) return replyError(interaction, 'The specified UUID is invalid.');

        const warning = (await db.query(/*sql*/ `SELECT user_id, reason, context_url, severity, mod_id, timestamp, edited_timestamp, edited_mod_id FROM warn WHERE id = $1;`, [id])).rows[0];
        if (!warning) return replyError(interaction, 'There is no warning with the specified UUID.');

        const content =
            `**User:** ${parseUser(warning.user_id)}` +
            `\n**Severity:** ${warning.severity}` +
            `\n**Reason:** ${warning.reason || 'No reason provided.'}` +
            `\n**Moderator:** ${parseUser(warning.mod_id)}` +
            `\n**Context:** ${formatContextURL(warning.context_url)}` +
            `\n**ID:** ${id}` +
            `\n**Created At:** ${formatTimeDate(new Date(warning.timestamp))}` +
            (warning.edited_timestamp ? `\n*(last edited by ${parseUser(warning.edited_mod_id)} at ${formatTimeDate(new Date(warning.edited_timestamp))})*` : '');

        replyInfo(interaction, content, 'Warning');
    },
};
