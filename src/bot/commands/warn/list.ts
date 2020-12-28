import uuid from 'uuid-random';
import { db } from '../../../db/postgres.js';
import { Command } from '../../commandHandler.js';
import { embedPages, sendError, sendInfo } from '../../lib/embeds.js';
import { formatDate, formatTimeDate } from '../../lib/misc.js';
import { getUser } from '../../lib/searchMessage.js';

export const command: Command = {
    commands: ['list'],
    superCommands: ['warn'],
    help: "Display your or another user's warns.",
    minArgs: 0,
    maxArgs: null,
    expectedArgs: '<uuid | <@user|userID|username> ["expired"]>',
    callback: async (message, args, text) => {
        const { channel, member } = message;

        if (args[0] && uuid.test(args[0])) {
            /**************************
             * LIST WARNING WITH UUID *
             **************************/

            const warning = (
                await db.query(
                    /*sql*/ `
                    SELECT user_id::TEXT, reason, severity, mod_id::TEXT, timestamp::TEXT, expire_days, expired, edited_timestamp::TEXT, edited_mod_id::TEXT
                    FROM warn 
                    WHERE id = $1
                    LIMIT 1;`,
                    [args[0]]
                )
            ).rows[0];

            if (!warning) return sendError(channel, 'There is no warning with this UUID.');

            const days = warning.expired
                ? formatDate(new Date(new Date(warning.timestamp).getTime() + warning.expire_days * 86400000))
                : Math.ceil((new Date(warning.timestamp).getTime() + warning.expire_days * 86400000 - new Date().getTime()) / 86400000);

            sendInfo(
                channel,
                `**User:** <@${warning.user_id}>
                **Severity:** ${warning.severity === 0 ? 'Normal' : 'Severe'}
                **Reason:** ${warning.reason || 'No reason provided.'} 
                **Moderator:** <@${warning.mod_id}> 
                **ID:** ${args[0]} 
                **Created At:** ${formatTimeDate(new Date(warning.timestamp))} 
                **${warning.expired ? 'Expired At' : 'Expiring In'}:** ${days} days
                ${warning.edited_timestamp ? `*(last edited by <@${warning.edited_mod_id}> at ${formatTimeDate(new Date(warning.edited_timestamp))})*` : ''}`,
                'Warning'
            );
        } else {
            /*****************************
             * LIST ALL WARNINGS OF USER *
             *****************************/

            const showExpired = args[args.length - 1]?.toLowerCase() === 'expired';

            let userID: string;
            if (args.length === 0 || (args.length === 1 && showExpired)) {
                userID = member.id;
            } else {
                try {
                    const user = await getUser(text);

                    if (user.id !== member.id && !member.hasPermission('KICK_MEMBERS'))
                        return sendError(channel, 'You do not have permission to view the warnings of other users.');

                    userID = user.id;
                } catch (error) {
                    return sendError(channel, error);
                }
            }

            const warnings = await db.query(
                /*sql*/ `
                SELECT id::TEXT, reason, severity, mod_id::TEXT, timestamp::TEXT, expire_days, expired, edited_timestamp::TEXT, edited_mod_id::TEXT
                FROM warn 
                WHERE user_id = $1 ${showExpired ? '' : 'AND expired = FALSE'}
                ORDER BY expired ASC, severity DESC, timestamp DESC;`,
                [userID]
            );

            if (warnings.rowCount === 0) return sendInfo(channel, `${userID === member.id ? 'You do' : '<@' + userID + '> does'} not have any warnings.`);

            const pages: string[] = [];
            warnings.rows.reduce((prev, curr, i, { length }) => {
                const days = curr.expired
                    ? formatDate(new Date(new Date(curr.timestamp).getTime() + curr.expire_days * 86400000))
                    : Math.ceil((new Date(curr.timestamp).getTime() + curr.expire_days * 86400000 - new Date().getTime()) / 86400000);

                const page = `**User:** <@${userID}>
                    **Severity:** ${curr.severity === 0 ? 'Normal' : 'Severe'}
                    **Reason:** ${curr.reason || 'No reason provided.'} 
                    **Moderator:** <@${curr.mod_id}> 
                    **ID:** ${curr.id} 
                    **Created At:** ${formatTimeDate(new Date(curr.timestamp))} 
                    **${curr.expired ? 'Expired At' : 'Expiring In'}:** ${days} days
                    ${curr.edited_timestamp ? `*(last edited by <@${curr.edited_mod_id}> at ${formatTimeDate(new Date(curr.edited_timestamp))})*` : ''}`;

                if ((i + 1) % 3 === 0 || i === length - 1) {
                    pages.push(prev + '\n\n' + page);
                    return '';
                }

                return prev + '\n\n' + page;
            }, '');

            const warningEmbed = await sendInfo(channel, pages[0], 'Warnings');
            embedPages(warningEmbed, member.user, pages);
        }
    },
};
