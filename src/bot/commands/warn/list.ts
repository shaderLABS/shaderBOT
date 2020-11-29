import { Command } from '../../commandHandler.js';
import { embedPages, sendError, sendInfo } from '../../lib/embeds.js';
import { db } from '../../../db/postgres.js';
import { getUser } from '../../lib/searchMessage.js';
import uuid from 'uuid-random';

export const command: Command = {
    commands: ['list'],
    superCommands: ['warn'],
    help: "Display your or another user's warns.",
    minArgs: 0,
    maxArgs: null,
    expectedArgs: '<uuid | <@user|userID|username> ["expired"]>',
    callback: async (message, args, text) => {
        const { channel, member } = message;
        if (!member) return;

        if (args[0] && uuid.test(args[0])) {
            /**************************
             * LIST WARNING WITH UUID *
             **************************/

            const warning = (
                await db.query(
                    /*sql*/ `
                    SELECT user_id::TEXT, reason, severity, mod_id::TEXT, timestamp::TEXT, expire_days, expired
                    FROM warn 
                    WHERE id = $1
                    LIMIT 1;`,
                    [args[0]]
                )
            ).rows[0];

            if (!warning) return sendError(channel, 'There is no warning with this UUID.');

            sendInfo(
                channel,
                `**User:** <@${warning.user_id}>
                **Type:** ${warning.severity === 0 ? 'Normal' : 'Severe'}
                **Reason:** ${warning.reason || 'No reason provided.'} 
                **Moderator:** <@${warning.mod_id}> 
                **ID:** ${args[0]} 
                **Created At:** ${new Date(warning.timestamp).toLocaleString()} 
                **${warning.expired ? 'Expired At' : 'Expiring In'}:** ${
                    warning.expired
                        ? new Date(new Date(warning.timestamp).getTime() + warning.expire_days * 86400000).toLocaleDateString()
                        : Math.ceil((new Date(warning.timestamp).getTime() + warning.expire_days * 86400000 - new Date().getTime()) / 86400000) + ' days'
                }`,
                'Warning'
            );
        } else {
            /*****************************
             * LIST ALL WARNINGS OF USER *
             *****************************/

            const showExpired = args[args.length - 1].toLowerCase() === 'expired';

            let userID: string;
            if (args.length === 0) {
                userID = member.id;
            } else {
                try {
                    const user = await getUser(message, text);

                    if (user.id !== member.id && !member.hasPermission('KICK_MEMBERS'))
                        return sendError(channel, 'You do not have permission to view the warnings of other users.');

                    userID = user.id;
                } catch (error) {
                    return sendError(channel, error);
                }
            }

            const warnings = await db.query(
                /*sql*/ `
                SELECT id::TEXT, reason, severity, mod_id::TEXT, timestamp::TEXT, expire_days, expired
                FROM warn 
                WHERE user_id = $1 ${showExpired ? '' : 'AND expired = FALSE'}
                ORDER BY expired ASC, severity DESC, timestamp DESC;`,
                [userID]
            );

            if (warnings.rowCount === 0) return sendInfo(channel, `${args.length === 0 ? 'You do' : '<@' + userID + '> does'} not have any warnings.`);

            const pages: string[] = [];
            warnings.rows.reduce((prev, curr, i, { length }) => {
                const days = curr.expired
                    ? new Date(new Date(curr.timestamp).getTime() + curr.expire_days * 86400000).toLocaleDateString()
                    : Math.ceil((new Date(curr.timestamp).getTime() + curr.expire_days * 86400000 - new Date().getTime()) / 86400000);

                const page = `**User:** <@${userID}>
                    **Type:** ${curr.severity === 0 ? 'Normal' : 'Severe'}
                    **Reason:** ${curr.reason || 'No reason provided.'} 
                    **Moderator:** <@${curr.mod_id}> 
                    **ID:** ${curr.id} 
                    **Created At:** ${new Date(curr.timestamp).toLocaleString()} 
                    **${curr.expired ? 'Expired At' : 'Expiring In'}:** ${
                    curr.expired
                        ? new Date(new Date(curr.timestamp).getTime() + curr.expire_days * 86400000).toLocaleDateString()
                        : Math.ceil((new Date(curr.timestamp).getTime() + curr.expire_days * 86400000 - new Date().getTime()) / 86400000) + ' days'
                }`;

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
