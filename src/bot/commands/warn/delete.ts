import uuid from 'uuid-random';
import { db } from '../../../db/postgres.js';
import { Command } from '../../commandHandler.js';
import { sendError, sendSuccess } from '../../lib/embeds.js';
import log from '../../lib/log.js';
import { parseUser } from '../../lib/misc.js';
import { getUser } from '../../lib/searchMessage.js';
import { formatTimeDate } from '../../lib/time.js';

const expectedArgs = '<uuid|<@user|userID|username>|reason>';

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

        let warning: any;

        try {
            if (uuid.test(args[0])) {
                warning = (await db.query(/*sql*/ `SELECT id, user_id, mod_id, severity, reason FROM warn WHERE id = $1;`, [args[0]])).rows[0];
            } else {
                const targetUser = await getUser(text, { author: message.author, channel });
                if (targetUser) {
                    // GRAB LATEST WARNING OF USER
                    warning = (await db.query(/*sql*/ `SELECT id, user_id, mod_id, severity, reason FROM warn WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 1;`, [targetUser.id])).rows[0];
                } else {
                    // GRAB WARNING BY REASON
                    const warnings = await db.query(
                        /*sql*/ `
                        SELECT id, user_id, mod_id, severity, reason, timestamp::TEXT
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
                                        `${parseUser(row.user_id)} warned by ${parseUser(row.mod_id)} for: "${row.reason || 'No reason provided.'}"\n${formatTimeDate(new Date(row.timestamp))} | ${
                                            row.id
                                        }\n`
                                )
                                .join('\n')}`
                        );
                    }

                    warning = warnings.rows[0];
                }
            }
        } catch (error) {
            if (error) return sendError(channel, error);
        }

        if (!warning) {
            const similarResults = await db.query(
                /*sql*/ `
                SELECT id, user_id, mod_id, reason, timestamp::TEXT
                FROM warn
                WHERE reason IS NOT NULL
                ORDER BY SIMILARITY(reason, $1) DESC
                LIMIT 3;`,
                [text]
            );

            let errorMessage = 'No warnings were found.';
            if (similarResults.rowCount !== 0)
                errorMessage +=
                    '\nSimilar results:\n' +
                    similarResults.rows
                        .map(
                            (row: any) =>
                                `${parseUser(row.user_id)} warned by ${parseUser(row.mod_id)} for: "${row.reason || 'No reason provided.'}"\n${formatTimeDate(new Date(row.timestamp))} | ${row.id}\n`
                        )
                        .join('\n');

            return sendError(channel, errorMessage);
        }

        const targetMember = await message.guild.members.fetch(warning.user_id).catch(() => undefined);
        if (targetMember && member.roles.highest.comparePositionTo(targetMember.roles.highest) <= 0)
            return sendError(channel, "You can't delete warnings from users with a role higher than or equal to yours.", 'Insufficient Permissions');

        await db.query(/*sql*/ `DELETE FROM warn WHERE id = $1;`, [warning.id]);

        const content = `**User:** ${parseUser(warning.user_id)}\n**Severity:** ${warning.severity}\n**Reason:** ${warning.reason || 'No reason provided.'}\n**Moderator:** ${parseUser(
            warning.mod_id
        )}\n**ID:** ${warning.id}`;

        sendSuccess(channel, content, 'Delete Warning');
        log(`**Deleted By:** ${member.id}\n${content}`, 'Delete Warning');
    },
};
