import uuid from 'uuid-random';
import { db } from '../../../db/postgres.js';
import { Command } from '../../commandHandler.js';
import { embedPages, sendError, sendInfo, sendSuccess } from '../../lib/embeds.js';
import { getUser } from '../../lib/searchMessage.js';
import { formatTimeDate } from '../../lib/time.js';

export const command: Command = {
    commands: ['list'],
    superCommands: ['warn'],
    help: "Display your or another user's warns.",
    minArgs: 0,
    maxArgs: null,
    expectedArgs: '<uuid | <@user|userID|username>>',
    callback: async (message, args, text) => {
        const { channel, member } = message;

        if (args[0] && uuid.test(args[0])) {
            /**************************
             * LIST WARNING WITH UUID *
             **************************/

            const warning = (
                await db.query(
                    /*sql*/ `
                    SELECT user_id::TEXT, reason, severity, mod_id::TEXT, timestamp::TEXT, edited_timestamp::TEXT, edited_mod_id::TEXT
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
                **Severity:** ${warning.severity}
                **Reason:** ${warning.reason || 'No reason provided.'}
                **Moderator:** <@${warning.mod_id}>
                **ID:** ${args[0]}
                **Created At:** ${formatTimeDate(new Date(warning.timestamp))}
                ${warning.edited_timestamp ? `*(last edited by <@${warning.edited_mod_id}> at ${formatTimeDate(new Date(warning.edited_timestamp))})*` : ''}`,
                'Warning'
            );
        } else {
            /*****************************
             * LIST ALL WARNINGS OF USER *
             *****************************/

            let userID: string;
            if (args.length === 0) {
                userID = member.id;
            } else {
                try {
                    const user = await getUser(text);
                    if (user.id !== member.id && !member.hasPermission('KICK_MEMBERS')) return sendError(channel, 'You do not have permission to view the warnings of other users.');
                    userID = user.id;
                } catch (error) {
                    return sendError(channel, error);
                }
            }

            const warnings = await db.query(
                /*sql*/ `
                SELECT id::TEXT, reason, severity, mod_id::TEXT, timestamp, edited_timestamp::TEXT, edited_mod_id::TEXT
                FROM warn
                WHERE user_id = $1
                ORDER BY timestamp DESC;`,
                [userID]
            );

            if (warnings.rowCount === 0) return sendInfo(channel, `${userID === member.id ? 'You do' : '<@' + userID + '> does'} not have any warnings.`);

            const pages: string[] = [];
            warnings.rows.reduce((prev, curr, i, { length }) => {
                const page = `**User:** <@${userID}>
                    **Severity:** ${curr.severity}
                    **Reason:** ${curr.reason || 'No reason provided.'}
                    **Moderator:** <@${curr.mod_id}>
                    **ID:** ${curr.id}
                    **Created At:** ${formatTimeDate(new Date(curr.timestamp))}
                    ${curr.edited_timestamp ? `*(last edited by <@${curr.edited_mod_id}> at ${formatTimeDate(new Date(curr.edited_timestamp))})*` : ''}`;

                if ((i + 1) % 3 === 0 || i === length - 1) {
                    pages.push(prev + '\n\n' + page);
                    return '';
                }

                return prev + '\n\n' + page;
            }, '');

            if (member.id === userID) {
                // DM
                try {
                    const warningEmbed = await sendInfo(await member.createDM(), pages[0], 'Warnings');
                    embedPages(warningEmbed, member.user, pages);
                    sendSuccess(channel, 'Successfully sent you your warnings in a DM.');
                } catch {
                    sendError(channel, "Failed to send you a DM. Please make sure that they're open and try again.");
                }
            } else {
                // public
                const warningEmbed = await sendInfo(channel, pages[0], 'Warnings');
                embedPages(warningEmbed, member.user, pages);
            }
        }
    },
};
