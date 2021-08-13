import { MessageEmbed } from 'discord.js';
import { db } from '../../../db/postgres.js';
import { Command } from '../../commandHandler.js';
import automaticPunishment from '../../lib/automaticPunishment.js';
import { embedColor, sendError, sendSuccess } from '../../lib/embeds.js';
import log from '../../lib/log.js';
import { parseUser } from '../../lib/misc.js';
import { getMember, removeArgumentsFromText, requireUser } from '../../lib/searchMessage.js';

const expectedArgs = '<severity> <@user|userID|username> [reason]';

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

        const severity = Number.parseInt(args[0]);
        if (severity < 0 || severity > 3) return sendError(channel, 'The severity must be an integer between 0 and 3.');

        try {
            const targetMember = await getMember(args[1], { author: message.author, channel });
            const targetUser = targetMember?.user || (await requireUser(args[1], { author: message.author, channel }));

            if (targetMember && member.roles.highest.comparePositionTo(targetMember.roles.highest) <= 0)
                return sendError(channel, "You can't warn a user with a role higher than or equal to yours.", 'Insufficient Permissions');

            const id = (
                await db.query(
                    /*sql*/ `
                    INSERT INTO warn (user_id, mod_id, reason, severity, timestamp)
                    VALUES ($1, $2, $3, $4::SMALLINT, $5)
                    RETURNING id;`,
                    [targetUser.id, member.id, reason.length !== 0 ? reason : null, severity, new Date()]
                )
            ).rows[0].id;

            let content = `**User:** ${parseUser(targetUser)}\n**Severity:** ${severity}\n**Reason:** ${reason || 'No reason provided.'}\n**Moderator:** ${parseUser(member.user)}\n**ID:** ${id}`;
            await targetUser.send({ embeds: [new MessageEmbed({ author: { name: 'You have been warned in shaderLABS.' }, description: content, color: embedColor.blue })] }).catch(() => {
                content += '\n\n*The target could not be DMed.*';
            });

            sendSuccess(channel, content, 'Create Warning');
            log(content, 'Create Warning');

            await automaticPunishment(targetUser, targetMember);
        } catch (error) {
            if (error) sendError(channel, error);
        }
    },
};
