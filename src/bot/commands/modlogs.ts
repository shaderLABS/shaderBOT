import { db } from '../../db/postgres.js';
import { Command } from '../commandHandler.js';
import { getPunishmentPoints } from '../lib/automaticPunishment.js';
import { embedPages, sendError, sendInfo } from '../lib/embeds.js';
import { parseUser } from '../lib/misc.js';
import { punishmentTypeAsString } from '../lib/punishments.js';
import { getUser } from '../lib/searchMessage.js';
import { formatTimeDate } from '../lib/time.js';

export const command: Command = {
    commands: ['modlogs', 'mlogs', 'logs'],
    expectedArgs: '<@user|userID|username>',
    help: 'Sends all moderation-related logs of a user.',
    minArgs: 1,
    maxArgs: null,
    requiredPermissions: ['KICK_MEMBERS'],
    callback: async (message, _, text) => {
        const { channel } = message;

        try {
            const user = await getUser(text);

            const warnQuery = db.query(
                /*sql*/ `
                SELECT * FROM warn WHERE user_id = $1 ORDER BY timestamp DESC;`,
                [user.id]
            );

            const punishmentQuery = db.query(
                /*sql*/ `
                SELECT * FROM punishment WHERE user_id = $1 ORDER BY timestamp DESC;`,
                [user.id]
            );

            const noteQuery = db.query(
                /*sql*/ `
                SELECT * FROM note WHERE user_id = $1 ORDER BY timestamp DESC;`,
                [user.id]
            );

            const pastPunishmentQuery = db.query(
                /*sql*/ `
                SELECT * FROM past_punishment WHERE user_id = $1 ORDER BY timestamp DESC;`,
                [user.id]
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
                            `\n**Reason:** ${row.reason || 'No reason provided.'}` +
                            `\n**Moderator:** ${parseUser(row.mod_id)}` +
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
                            `\n**Reason:** ${row.reason || 'No reason provided.'}` +
                            `\n**Moderator:** ${row.mod_id ? parseUser(row.mod_id) : 'System'}` +
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
                            `\n**Reason:** ${row.reason || 'No reason provided.'}` +
                            `\n**Moderator:** ${row.mod_id ? parseUser(row.mod_id) : 'System'}` +
                            `\n**ID:** ${row.id}` +
                            `\n**Created At:** ${formatTimeDate(new Date(row.timestamp))}`;

                        if (row.lifted_timestamp) content += `\n**Lifted At:** ${formatTimeDate(new Date(row.lifted_timestamp))}`;
                        if (row.lifted_mod_id) content += `\n**Lifted By:** ${parseUser(row.lifted_mod_id)}`;
                        if (row.edited_timestamp) content += `\n*(last edited by ${parseUser(row.edited_mod_id)} at ${formatTimeDate(new Date(row.edited_timestamp))})*`;

                        return content;
                    })
                );
            }

            const punishmentPoints = await getPunishmentPoints(user.id);
            if (punishmentPoints !== 0) pages[0] = `**Punishment Points:** ${punishmentPoints}\n\n` + pages[0];

            const embedMessage = await sendInfo(channel, pages[0] || 'There are no entries for this user.', `Moderation Logs - ${user.tag}`);
            embedPages(embedMessage, message.author, pages);
        } catch (error) {
            sendError(channel, error);
        }
    },
};
