import { db } from '../../../../db/postgres.js';
import { GuildCommandInteraction } from '../../../events/interactionCreate.js';
import { embedIcon, replyButtonPages, replyError } from '../../../lib/embeds.js';
import { formatContextURL, parseUser } from '../../../lib/misc.js';
import { formatTimeDate } from '../../../lib/time.js';
import { ApplicationCommandCallback } from '../../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: ['KICK_MEMBERS'],
    callback: async (interaction: GuildCommandInteraction) => {
        const targetUser = interaction.options.getUser('user', true);

        const notes = (
            await db.query(
                /*sql*/ `
                SELECT * FROM note WHERE user_id = $1 ORDER BY timestamp DESC;`,
                [targetUser.id]
            )
        ).rows;
        if (notes.length === 0) return replyError(interaction, 'There are no notes for this user.');

        const pages: string[] = [];
        notes.reduce((prev, curr, i, { length }) => {
            const page =
                `**User:** ${parseUser(targetUser)}` +
                `\n**Content:** ${curr.content}` +
                `\n**Moderator:** ${parseUser(curr.mod_id)}` +
                `\n**Context:** ${formatContextURL(curr.context_url)}` +
                `\n**Created At:** ${formatTimeDate(new Date(curr.timestamp))}` +
                `\n**ID:** ${curr.id}` +
                (curr.edited_timestamp ? `\n*(last edited by ${parseUser(curr.edited_mod_id)} at ${formatTimeDate(new Date(curr.edited_timestamp))})*` : '');

            if ((i + 1) % 3 === 0 || i === length - 1) {
                pages.push(prev + '\n\n' + page);
                return '';
            }

            return prev + '\n\n' + page;
        }, '');

        replyButtonPages(interaction, pages, notes.length > 1 ? 'Notes' : 'Note', 0xffc107, embedIcon.note);
    },
};
