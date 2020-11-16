import { db } from '../../../db/postgres.js';
import { Command } from '../../commandHandler.js';
import { sendError, sendSuccess } from '../../lib/embeds.js';
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
        const isUUID = uuid.test(args[0]);

        if (!isUUID) {
            const warnings = await db.query(
                /*sql*/ `
                SELECT id::TEXT, user_id::TEXT, mod_id::TEXT, reason, timestamp::TEXT 
                FROM warn 
                WHERE reason = $1;`,
                [text]
            );

            if (warnings.rowCount > 1) {
                return sendError(
                    channel,
                    `The specified reason is ambiguous. Please use the UUID from one of the following results instead:\n${warnings.rows
                        .map(
                            (row: any) =>
                                `<@${row.user_id}> warned by <@${row.mod_id}> for: "${row.reason || 'No reason provided.'}"\n${new Date(row.timestamp).toLocaleString()} | ${
                                    row.id
                                }\n`
                        )
                        .join('\n')}`
                );
            }
        }

        const response = await db.query(
            /*sql*/ `
            DELETE FROM warn 
            WHERE ${isUUID ? 'id = $1' : 'reason = $1'}
            RETURNING id::TEXT, user_id::TEXT, severity, reason`,
            [isUUID ? args[0] : text]
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
                        .map(
                            (row: any) =>
                                `<@${row.user_id}> warned by <@${row.mod_id}> for: "${row.reason || 'No reason provided.'}"\n${new Date(row.timestamp).toLocaleString()} | ${
                                    row.id
                                }\n`
                        )
                        .join('\n');
            return sendError(channel, errorMessage);
        }

        const warn = response.rows[0];

        const userMember = await message.guild?.members.fetch(warn.user_id).catch(() => undefined);
        if (userMember && member.roles.highest.comparePositionTo(userMember.roles.highest) <= 0)
            return sendError(channel, "You can't delete warnings from users with a role higher than or equal to yours.", 'INSUFFICIENT PERMISSIONS');

        sendSuccess(channel, `Deleted ${warn.severity == 0 ? 'normal' : 'severe'} warning ${warn.id} from <@${warn.user_id}>:\n\n${warn.reason}`, 'DELETED WARNING');
        log(`<@${member.id}> deleted ${warn.severity == 0 ? 'normal' : 'severe'} warning ${warn.id} from <@${warn.user_id}>:\n\n${warn.reason}`);
    },
};
