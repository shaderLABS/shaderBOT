import { db } from '../../../db/postgres.js';
import { GuildCommandInteraction } from '../../events/interactionCreate.js';
import { getPunishmentPoints } from '../../lib/automaticPunishment.js';
import { replyButtonPages } from '../../lib/embeds.js';
import { formatContextURL, parseUser } from '../../lib/misc.js';
import { punishmentTypeAsString } from '../../lib/punishments.js';
import { formatTimeDate } from '../../lib/time.js';
import { ApplicationCommandCallback } from '../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: ['KICK_MEMBERS'],
    callback: async (interaction: GuildCommandInteraction) => {
        const targetUser = interaction.options.getUser('user', true);

        const warnQuery = db.query(
            /*sql*/ `
            SELECT * FROM warn WHERE user_id = $1 ORDER BY timestamp DESC;`,
            [targetUser.id]
        );

        const punishmentQuery = db.query(
            /*sql*/ `
            SELECT * FROM punishment WHERE user_id = $1 ORDER BY timestamp DESC;`,
            [targetUser.id]
        );

        const noteQuery = db.query(
            /*sql*/ `
            SELECT * FROM note WHERE user_id = $1 ORDER BY timestamp DESC;`,
            [targetUser.id]
        );

        const pastPunishmentQuery = db.query(
            /*sql*/ `
            SELECT * FROM past_punishment WHERE user_id = $1 ORDER BY timestamp DESC;`,
            [targetUser.id]
        );

        const queries = await Promise.all([warnQuery, punishmentQuery, noteQuery, pastPunishmentQuery]);

        let pages: string[] = [];
        function pageCategory(title: string, content: string[]) {
            content.reduce((prev, curr, i, arr) => {
                const isLast = i === arr.length - 1;
                if ((i + 1) % 3 === 0 || isLast) {
                    pages.push(isLast ? prev + '\n' + curr : prev + '\n' + curr + '\n\n_(continued on next page)_');
                    return '';
                }

                return prev + '\n' + curr;
            }, `**${title}**`);
        }

        if (queries[0].rowCount !== 0) {
            pageCategory(
                `Warnings (${queries[0].rowCount})`,
                queries[0].rows.map(
                    (row) =>
                        `\n**Severity:** ${row.severity}` +
                        `\n**Reason:** ${row.reason}` +
                        `\n**Moderator:** ${parseUser(row.mod_id)}` +
                        `\n**Context:** ${formatContextURL(row.context_url)}` +
                        `\n**ID:** ${row.id}` +
                        `\n**Created At:** ${formatTimeDate(new Date(row.timestamp))}`
                )
            );
        }

        if (queries[1].rowCount !== 0) {
            pageCategory(
                `Punishments (${queries[1].rowCount})`,
                queries[1].rows.map(
                    (row) =>
                        `\n**Type:** ${punishmentTypeAsString[row.type]}` +
                        `\n**Reason:** ${row.reason}` +
                        `\n**Moderator:** ${row.mod_id ? parseUser(row.mod_id) : 'System'}` +
                        `\n**Context:** ${formatContextURL(row.context_url)}` +
                        `\n**ID:** ${row.id}` +
                        `\n**Created At:** ${formatTimeDate(new Date(row.timestamp))}` +
                        `\n**Expiring At:** ${row.expire_timestamp ? formatTimeDate(new Date(row.expire_timestamp)) : 'Permanent'}` +
                        (row.edited_timestamp ? `\n*(last edited by ${parseUser(row.edited_mod_id)} at ${formatTimeDate(new Date(row.edited_timestamp))})*` : '')
                )
            );
        }

        if (queries[2].rowCount !== 0) {
            pageCategory(
                `Notes (${queries[2].rowCount})`,
                queries[2].rows.map(
                    (row) =>
                        `\n**Content:** ${row.content}` +
                        `\n**Moderator:** ${parseUser(row.mod_id)}` +
                        `\n**Context:** ${formatContextURL(row.context_url)}` +
                        `\n**ID:** ${row.id}` +
                        `\n**Created At:** ${formatTimeDate(new Date(row.timestamp))}` +
                        (row.edited_timestamp ? `\n*(last edited by ${parseUser(row.edited_mod_id)} at ${formatTimeDate(new Date(row.edited_timestamp))})*` : '')
                )
            );
        }

        if (queries[3].rowCount !== 0) {
            pageCategory(
                `Past Punishments (${queries[3].rowCount})`,
                queries[3].rows.map((row) => {
                    let content =
                        `\n**Type:** ${punishmentTypeAsString[row.type]}` +
                        `\n**Reason:** ${row.reason}` +
                        `\n**Moderator:** ${row.mod_id ? parseUser(row.mod_id) : 'System'}` +
                        `\n**Context:** ${formatContextURL(row.context_url)}` +
                        `\n**ID:** ${row.id}` +
                        `\n**Created At:** ${formatTimeDate(new Date(row.timestamp))}`;

                    if (row.lifted_timestamp) content += `\n**Lifted At:** ${formatTimeDate(new Date(row.lifted_timestamp))}`;
                    if (row.lifted_mod_id) content += `\n**Lifted By:** ${parseUser(row.lifted_mod_id)}`;
                    if (row.edited_timestamp) content += `\n*(last edited by ${parseUser(row.edited_mod_id)} at ${formatTimeDate(new Date(row.edited_timestamp))})*`;

                    return content;
                })
            );
        }

        if (!pages[0]) pages[0] = 'There are no entries for this user.';

        const punishmentPoints = await getPunishmentPoints(targetUser.id);
        if (punishmentPoints !== 0) pages[0] = `**Punishment Points:** ${punishmentPoints}\n\n` + pages[0];

        replyButtonPages(interaction, pages, `Moderation Logs - ${targetUser.tag}`);
    },
};
