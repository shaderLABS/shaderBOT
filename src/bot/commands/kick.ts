import { Command } from '../commandHandler.js';
import { sendError, sendSuccess } from '../lib/embeds.js';
import { kick } from '../lib/kickUser.js';
import { getMember, removeArgumentsFromText } from '../lib/searchMessage.js';

export const command: Command = {
    commands: ['kick'],
    help: 'Kick a user.',
    minArgs: 1,
    maxArgs: null,
    expectedArgs: '<@user|userID|username> [reason]',
    requiredPermissions: ['KICK_MEMBERS'],
    callback: async (message, args, text) => {
        const { member, channel } = message;

        const user = await getMember(args[0]).catch(() => undefined);
        if (!user) return sendError(channel, 'The specified user argument is not resolvable.');

        const reason = removeArgumentsFromText(text, args[0]);

        if (member.roles.highest.comparePositionTo(user.roles.highest) <= 0) return sendError(channel, "You can't kick a user with a role higher than or equal to yours.", 'Insufficient Permissions');
        if (!user.kickable) return sendError(channel, 'This user is not kickable.');

        try {
            const { dmed } = await kick(user, member.id, reason);
            sendSuccess(channel, `<@${user.id}> has been kicked:\n\`${reason || 'No reason provided.'}\`${dmed ? '' : '\n\n*The target could not be DMed.*'}`);
        } catch (error) {
            sendError(channel, error);
        }
    },
};
