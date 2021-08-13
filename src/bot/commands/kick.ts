import { Command } from '../commandHandler.js';
import { sendError, sendSuccess } from '../lib/embeds.js';
import { kick } from '../lib/kickUser.js';
import { parseUser } from '../lib/misc.js';
import { removeArgumentsFromText, requireMember } from '../lib/searchMessage.js';

export const command: Command = {
    commands: ['kick'],
    help: 'Kick a user.',
    minArgs: 1,
    maxArgs: null,
    expectedArgs: '<@user|userID|username> [reason]',
    requiredPermissions: ['KICK_MEMBERS'],
    callback: async (message, args, text) => {
        const { member, channel } = message;

        try {
            const targetMember = await requireMember(args[0], { author: message.author, channel });
            const reason = removeArgumentsFromText(text, args[0]);

            if (member.roles.highest.comparePositionTo(targetMember.roles.highest) <= 0)
                return sendError(channel, "You can't kick a user with a role higher than or equal to yours.", 'Insufficient Permissions');
            if (!targetMember.kickable) return sendError(channel, 'This user is not kickable.');

            const { dmed } = await kick(targetMember, member.id, reason);
            sendSuccess(channel, `${parseUser(targetMember.user)} has been kicked:\n\`${reason || 'No reason provided.'}\`${dmed ? '' : '\n\n*The target could not be DMed.*'}`, 'Kick');
        } catch (error) {
            if (error) sendError(channel, error);
        }
    },
};
