import { Command } from '../commandHandler.js';
import { embedPages, sendError, sendInfo } from '../lib/embeds.js';
import { getUser } from '../lib/searchMessage.js';
import { db } from '../../db/postgres.js';
import { typeAsString } from '../lib/punishments.js';

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
            const user = await getUser(message, text);

            const warnQuery = db.query(
                /*sql*/ `
                SELECT * FROM warn WHERE user_id = $1 ORDER BY expired ASC, severity DESC, timestamp DESC;`,
                [user.id]
            );

            const punishmentQuery = db.query(
                /*sql*/ `
                SELECT * FROM punishment WHERE user_id = $1 ORDER BY timestamp DESC;`,
                [user.id]
            );

            const noteQuery = db.query(
                /*sql*/ `
                SELECT * FROM note WHERE user_id = $1;`,
                [user.id]
            );

            const pastPunishmentQuery = db.query(
                /*sql*/ `
                SELECT * FROM past_punishment WHERE user_id = $1 ORDER BY timestamp DESC;`,
                [user.id]
            );

            const queries = await Promise.all([warnQuery, punishmentQuery, noteQuery, pastPunishmentQuery]);
            const warns: [any[], any[]] = queries[0].rows.reduce(([nonexp, exp], val) => (val.expired === false ? [[...nonexp, val], exp] : [nonexp, [...exp, val]]), [
                [],
                [],
            ]);

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

            if (warns[0]) {
                pageCategory(
                    'Warnings',
                    warns[0].map(
                        (row) =>
                            `\n**Type:** ${row.severity === 0 ? 'Normal' : 'Severe'}
                            **Reason:** ${row.reason || 'No reason provided.'} 
                            **By:** <@${row.mod_id}> 
                            **ID:** ${row.id} 
                            **Created At:** ${new Date(row.timestamp).toLocaleString()} 
                            **Expiring In:** ${Math.ceil((new Date(row.timestamp).getTime() + row.expire_days * 86400000 - new Date().getTime()) / 86400000)} days`
                    )
                );
            }

            if (queries[1].rowCount !== 0) {
                pageCategory(
                    'Punishments',
                    queries[1].rows.map(
                        (row) =>
                            `\n**Type:** ${typeAsString[row.type]} 
                            **Reason:** ${row.reason || 'No reason provided.'} 
                            **By:** <@${row.mod_id}> 
                            **ID:** ${row.id} 
                            **Created At:** ${new Date(row.timestamp).toLocaleString()} 
                            **Expiring At:** ${new Date(row.expire_timestamp).toLocaleString()}`
                    )
                );
            }

            if (queries[2].rowCount !== 0) {
                pageCategory(
                    'Notes',
                    queries[2].rows.map(
                        (row) =>
                            `\n**User:** <@${row.user_id}>
                            **Moderator:** <@${row.mod_id}>
                            **Content:** ${row.content}
                            **ID:** ${row.id}
                            **Created At:** ${new Date(row.timestamp).toLocaleString()}`
                    )
                );
            }

            if (queries[3].rowCount !== 0) {
                pageCategory(
                    'Past Punishments',
                    queries[3].rows.map((row) => {
                        let content = `\n**Type:** ${typeAsString[row.type]} 
                            **Reason:** ${row.reason || 'No reason provided.'} 
                            **By:** <@${row.mod_id}> 
                            **ID:** ${row.id} 
                            **Created At:** ${new Date(row.timestamp).toLocaleString()}`;

                        if (row.lifted_timestamp) content += `\n**Lifted At:** ${new Date(row.lifted_timestamp).toLocaleString()}`;
                        if (row.lifted_mod_id) content += `\n**Lifted By:** <@${row.lifted_mod_id}>`;

                        return content;
                    })
                );

                // .match(/[\s\S]{1,2000}(?!\S)/g);
            }

            if (warns[1]) {
                pageCategory(
                    'Expired Warnings',
                    warns[1].map(
                        (row) =>
                            `\n**Type:** ${row.severity === 0 ? 'Normal' : 'Severe'} 
                            **Reason:** ${row.reason || 'No reason provided.'} 
                            **By:** <@${row.mod_id}> 
                            **ID:** ${row.id} 
                            **Created At:** ${new Date(row.timestamp).toLocaleString()} 
                            **Expired At:** ${new Date(new Date(row.timestamp).getTime() + row.expire_days * 86400000).toLocaleDateString()}`
                    )
                );
            }

            const embedMessage = await sendInfo(channel, pages[0], 'Moderation Logs');
            embedPages(embedMessage, message.author, pages);
        } catch (error) {
            sendError(channel, error);
        }
    },
};
