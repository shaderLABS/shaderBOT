import { db } from '../../../db/postgres.js';
import { Command, syntaxError } from '../../commandHandler.js';
import { sendError, sendSuccess } from '../../lib/embeds.js';
import log from '../../lib/log.js';
import { getMember, getUser, removeArgumentsFromText } from '../../lib/searchMessage.js';

const expectedArgs = '<"normal"|"severe"> <@user|userID|username> [reason]';

export const command: Command = {
    commands: ['create'],
    superCommands: ['warn'],
    help: 'Warn a user.',
    minArgs: 2,
    maxArgs: null,
    expectedArgs,
    requiredPermissions: ['KICK_MEMBERS'],
    callback: async (message, args, text) => {
        const { member, channel } = message;

        const reason = removeArgumentsFromText(text, args[1]);
        if (reason.length > 500) return sendError(channel, 'The reason must not be more than 500 characters long.');

        const severityArg = args[0].toUpperCase();
        if (!['NORMAL', 'SEVERE'].includes(severityArg)) return syntaxError(channel, expectedArgs);
        const severity = severityArg === 'NORMAL' ? 0 : 1;

        const targetMember = await getMember(args[1]).catch(() => undefined);
        const user = targetMember?.user || (await getUser(args[1]).catch(() => undefined));
        if (!user) return syntaxError(channel, expectedArgs);

        if (targetMember && member.roles.highest.comparePositionTo(targetMember.roles.highest) <= 0)
            return sendError(channel, "You can't warn a user with a role higher than or equal to yours.", 'Insufficient Permissions');

        const userWarnings = await db.query(
            /*sql*/ `
            SELECT COUNT(id)
            FROM warn
            WHERE expired = FALSE AND user_id = $1
            GROUP BY severity
            ORDER BY severity;`,
            [user.id]
        );

        let normalWarnings = +userWarnings.rows[0]?.count || 0;
        let severeWarnings = +userWarnings.rows[1]?.count || 0;

        severity === 0 ? normalWarnings++ : severeWarnings++;
        const expire_days = 14 * normalWarnings + 60 * severeWarnings;

        const id = (
            await db.query(
                /*sql*/ `
                INSERT INTO warn (user_id, mod_id, reason, severity, expire_days, timestamp) 
                VALUES ($1, $2, $3, $4, $5::SMALLINT, $6)
                RETURNING id;`,
                [user.id, member.id, reason.length !== 0 ? reason : null, severity, expire_days, new Date()]
            )
        ).rows[0].id;

        const content = `**User:** <@${user.id}>\n**Severity:** ${severity === 0 ? 'Normal' : 'Severe'}\n**Reason:** ${reason || 'No reason provided.'}\n**Moderator:** <@${
            member.id
        }>\n**ID:** ${id}\n**Expiring In:** ${expire_days} days`;

        sendSuccess(channel, content, 'Added Warning');
        log(content, 'Added Warning');
    },
};
