import { Snowflake } from 'discord.js';
import uuid from 'uuid-random';
import { db } from '../../../db/postgres.js';
import { Command } from '../../commandHandler.js';
import { embedPages, sendError, sendInfo, sendSuccess } from '../../lib/embeds.js';
import { parseUser, sleep } from '../../lib/misc.js';
import { requireUser } from '../../lib/searchMessage.js';
import { formatTimeDate } from '../../lib/time.js';

export const command: Command = {
    commands: ['list'],
    superCommands: ['warn'],
    help: "Display your or another user's warns.",
    minArgs: 0,
    maxArgs: null,
    expectedArgs: '[uuid | <@user|userID|username>]',
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

            const content =
                `**User:** ${parseUser(warning.user_id)}\n` +
                `**Severity:** ${warning.severity}\n` +
                `**Reason:** ${warning.reason || 'No reason provided.'}\n` +
                `**Moderator:** ${parseUser(warning.mod_id)}\n` +
                `**ID:** ${args[0]}\n` +
                `**Created At:** ${formatTimeDate(new Date(warning.timestamp))}` +
                (warning.edited_timestamp ? `\n*(last edited by ${parseUser(warning.edited_mod_id)} at ${formatTimeDate(new Date(warning.edited_timestamp))})*` : '');

            sendInfo(channel, content, 'Warning');
        } else {
            /*****************************
             * LIST ALL WARNINGS OF USER *
             *****************************/

            let userID: Snowflake;
            if (args.length === 0) {
                userID = member.id;
            } else {
                try {
                    const user = await requireUser(text);
                    if (user.id !== member.id && !member.permissions.has('KICK_MEMBERS')) return sendError(channel, 'You do not have permission to view the warnings of other users.');
                    userID = user.id;
                } catch (error) {
                    if (error) sendError(channel, error);
                    return;
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
                const page =
                    `**User:** ${parseUser(userID)}\n` +
                    `**Severity:** ${curr.severity}\n` +
                    `**Reason:** ${curr.reason || 'No reason provided.'}\n` +
                    `**Moderator:** ${parseUser(curr.mod_id)}\n` +
                    `**ID:** ${curr.id}\n` +
                    `**Created At:** ${formatTimeDate(new Date(curr.timestamp))}` +
                    (curr.edited_timestamp ? `\n*(last edited by ${parseUser(curr.edited_mod_id)} at ${formatTimeDate(new Date(curr.edited_timestamp))})*` : '');

                if ((i + 1) % 3 === 0 || i === length - 1) {
                    pages.push(prev + '\n\n' + page);
                    return '';
                }

                return prev + '\n\n' + page;
            }, '');

            if (member.id === userID) {
                // DM
                try {
                    const dmChannel = await member.createDM();

                    for (let i = 0; i < pages.length; i++) {
                        if (i === 0) await sendInfo(dmChannel, pages[0], 'Warnings');
                        else await sendInfo(dmChannel, pages[i]);

                        await sleep(1000);
                    }

                    sendSuccess(channel, 'Successfully sent you your warnings in a DM.', 'List Warnings');
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
