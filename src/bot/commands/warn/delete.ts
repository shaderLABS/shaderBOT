import { db } from '../../../db/postgres.js';
import { client } from '../../bot.js';
import { Command, syntaxError } from '../../commandHandler.js';
import { sendError, sendInfo } from '../../lib/embeds.js';
import uuid from 'uuid-random';
import log from '../../lib/log.js';

const expectedArgs = '<uuid|reason>';

export const command: Command = {
    commands: ['delete'],
    superCommands: ['warn'],
    help: 'Delete a warning.',
    minArgs: 1,
    maxArgs: null,
    expectedArgs,
    requiredPermissions: ['KICK_MEMBERS'],
    callback: async (message, args, text) => {
        const { member, channel } = message;
        if (!member) return;

        // if (uuid.test(args[0])) {
        //     await db.query(
        //         /*sql*/ `
        //         DELETE FROM warn
        //         WHERE id = $1
        //         RETURNING user_id::TEXT, mod_id::TEXT, reason;
        //         `,
        //         [args[0]]
        //     );
        // }

        const response = await db.query(
            /*sql*/ `
            DELETE FROM warn 
            WHERE ${uuid.test(args[0]) ? 'id = $1' : 'reason = $1'}
            RETURNING id::TEXT, user_id::TEXT, reason`,
            [uuid.test(args[0]) ? args[0] : text]
        );

        if (response.rowCount === 0) {
            const similarResults = await db.query(
                /*sql*/ `
                SELECT id::TEXT, user_id::TEXT, mod_id::TEXT, reason, timestamp::TEXT 
                FROM warn
                WHERE reason IS NOT NULL
                ORDER BY SIMILARITY(reason, $1) DESC
                LIMIT 3`,
                [text]
            );

            let errorMessage = 'No warnings were found.';
            if (similarResults.rowCount !== 0)
                errorMessage +=
                    '\nSimilar results:\n' +
                    similarResults.rows
                        .map((row: any) => `<@${row.user_id}> warned by <@${row.mod_id}> for: "${row.reason || 'No reason provided.'}"\n${row.timestamp} | ${row.id}\n`)
                        .join('\n');
            sendError(channel, errorMessage);
        }

        // if (member.roles.highest.comparePositionTo(user.roles.highest) <= 0)
        //     return sendError(channel, "You can't delete warnings from users with a role higher than or equal to yours.", 'INSUFFICIENT PERMISSIONS');

        // // const reason = text.substring(args[0].length + args[1].length + 1).trim();
        // const reason = args.slice(2).join(' ');
        // const timestamp = new Date();

        // const id = (
        //     await db.query(
        //         /*sql*/ `
        //         INSERT INTO warn (user_id, mod_id, reason, severity, timestamp)
        //         VALUES ($1, $2, $3, $4, $5)
        //         RETURNING id;`,
        //         [user.id, member.id, reason.length !== 0 ? reason : null, severity, timestamp]
        //     )
        // ).rows[0].id;

        // const content = `\`USER:\` <@${user.id}>\n\`REASON:\` ${reason.length !== 0 ? reason : 'No reason provided.'}\n\`SEVERITY:\` ${severityArg}\n\`BY:\` <@${
        //     member.id
        // }>\n\`CREATED AT:\` ${timestamp.toISOString()}\n\`ID:\` ${id}`;

        // sendInfo(channel, content, 'WARNING');
        // log(content);
    },
};
