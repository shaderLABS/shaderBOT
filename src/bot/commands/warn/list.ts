import { Command } from '../../commandHandler.js';
import { embedPages, sendError, sendInfo } from '../../lib/embeds.js';
import { db } from '../../../db/postgres.js';
import { getUser } from '../../lib/searchMessage.js';
import { MessageEmbed } from 'discord.js';

// SELECT "expire_warns"();

export const command: Command = {
    commands: ['list'],
    superCommands: ['warn'],
    help: "Display your or another user's warns.",
    minArgs: 0,
    maxArgs: null,
    expectedArgs: '<@user|userID|username>',
    callback: async (message, args, text) => {
        const { channel, member } = message;
        if (!member) return;

        let userID: string;
        if (args.length === 0) {
            userID = member.id;
        } else {
            try {
                const user = await getUser(message, text);

                if (user.id !== member.id && !member?.hasPermission('KICK_MEMBERS'))
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
            WHERE user_id = $1
            ORDER BY expired ASC, severity DESC, timestamp DESC;`,
            [userID]
        );

        if (warnings.rowCount === 0) return sendInfo(channel, `${args.length === 0 ? 'You do' : '<@' + userID + '> does'} not have any warnings.`);

        // let content = '';
        // for (const row of warnings.rows) {
        //     content += `\`USER:\` <@${userID}>\n\`REASON:\` ${row.reason || 'No reason provided.'}\n\`SEVERITY:\` ${row.severity === 0 ? 'NORMAL' : 'SEVERE'}\n\`BY:\` <@${
        //         row.mod_id
        //     }>\n\`CREATED AT:\` ${row.timestamp}\n\`ID:\` ${row.id}\n\n`;
        // }

        let field: any = [[]];
        warnings.rows.forEach((row, index) => {
            field[index] = [
                { name: 'USER', value: `<@${userID}>`, inline: true },
                { name: 'SEVERITY', value: row.severity === 0 ? 'NORMAL' : 'SEVERE', inline: true },
                { name: 'REASON', value: `${row.reason || 'No reason provided.'}`, inline: true },
                { name: 'MODERATOR', value: `<@${row.mod_id}>`, inline: true },
                { name: 'CREATED AT', value: new Date(row.timestamp).toLocaleString(), inline: true },
                {
                    name: row.expired ? 'EXPIRED AT' : 'EXPIRING IN',
                    value: row.expired
                        ? new Date(new Date(row.timestamp).getTime() + row.expire_days * 86400000).toLocaleDateString()
                        : Math.ceil((new Date(row.timestamp).getTime() + row.expire_days * 86400000 - new Date().getTime()) / 86400000) + ' days',
                    inline: true,
                },
                { name: 'UUID', value: row.id, inline: true },
            ];
        });

        const warningEmbed = await channel.send(new MessageEmbed().addFields(field[0]));
        embedPages(warningEmbed, member.user, undefined, field);

        // const warningEmbed = await sendInfo(channel, content, 'WARNINGS');
    },
};
