import { db } from '../../../../db/postgres.js';
import { GuildCommandInteraction } from '../../../events/interactionCreate.js';
import { replyError, replySuccess } from '../../../lib/embeds.js';
import log from '../../../lib/log.js';
import { formatContextURL, parseUser, userToMember } from '../../../lib/misc.js';

export async function deleteWarning(interaction: GuildCommandInteraction, warning: any) {
    const targetMember = await userToMember(interaction.guild, warning.user_id);
    if (targetMember && interaction.member.roles.highest.comparePositionTo(targetMember.roles.highest) <= 0)
        return replyError(interaction, "You can't delete warnings from users with a role higher than or equal to yours.", 'Insufficient Permissions');

    await db.query(/*sql*/ `DELETE FROM warn WHERE id = $1;`, [warning.id]);

    const content =
        `**User:** ${parseUser(warning.user_id)}` +
        `\n**Severity:** ${warning.severity}` +
        `\n**Reason:** ${warning.reason}` +
        `\n**Moderator:** ${parseUser(warning.mod_id)}` +
        `\n**Context:** ${formatContextURL(warning.context_url)}` +
        `\n**ID:** ${warning.id}`;

    replySuccess(interaction, content, 'Delete Warning');
    log(`${content}\n**Deleted By:** ${parseUser(interaction.user)}`, 'Delete Warning');
}
