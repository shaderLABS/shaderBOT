import { MessageEmbed } from 'discord.js';
import { db } from '../../../db/postgres.js';
import { Command, syntaxError } from '../../commandHandler.js';
import { sendError } from '../../lib/embeds.js';
import log from '../../lib/log.js';

const expectedArgs = '<"normal"|"severe"> <@user|userID> [reason]';

export const command: Command = {
    commands: ['create'],
    superCommands: ['warn'],
    help: 'Warn a user.',
    minArgs: 2,
    maxArgs: null,
    expectedArgs,
    requiredPermissions: ['KICK_MEMBERS'],
    callback: async (message, args) => {
        const { member, channel } = message;
        if (!member) return;

        // const reason = text.substring(args[0].length + args[1].length + 1).trim();
        const reason = args.slice(2).join(' ');
        if (reason.length > 500) return sendError(channel, 'The reason must not be more than 500 characters long.');

        const severityArg = args[0].toUpperCase();
        if (!['NORMAL', 'SEVERE'].includes(severityArg)) return syntaxError(channel, expectedArgs);
        const severity = severityArg === 'NORMAL' ? 0 : 1;

        const user = message.mentions.members?.first() || (await member.guild.members.fetch(args[1]).catch(() => undefined));
        if (!user) return syntaxError(channel, expectedArgs);

        if (member.roles.highest.comparePositionTo(user.roles.highest) <= 0)
            return sendError(channel, "You can't warn a user with a role higher than or equal to yours.", 'INSUFFICIENT PERMISSIONS');

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
        // const expire_days = severity === 0 ? 14 * (normalWarnings + 1) : 60 * (severeWarnings + 1);

        const timestamp = new Date();

        const id = (
            await db.query(
                /*sql*/ `
                INSERT INTO warn (user_id, mod_id, reason, severity, expire_days, timestamp) 
                VALUES ($1, $2, $3, $4, $5::SMALLINT, $6)
                RETURNING id;`,
                [user.id, member.id, reason.length !== 0 ? reason : null, severity, expire_days, timestamp]
            )
        ).rows[0].id;

        const embed = new MessageEmbed()
            .setAuthor('WARNING')
            .addFields(
                { name: 'USER', value: `<@${user.id}>`, inline: true },
                { name: 'SEVERITY', value: severityArg, inline: true },
                { name: 'REASON', value: `${reason || 'No reason provided.'}`, inline: true },
                { name: 'MODERATOR', value: `<@${member.id}>`, inline: true },
                { name: 'EXPIRING IN', value: expire_days + ' days', inline: true },
                { name: 'UUID', value: id, inline: true }
            );

        channel.send(embed);
        log(embed);
    },
};
