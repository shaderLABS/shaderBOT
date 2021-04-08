import { Command } from '../../commandHandler.js';
import { sendError, sendSuccess } from '../../lib/embeds.js';
import { parseUser } from '../../lib/misc.js';
import { unmute } from '../../lib/muteUser.js';
import { getMember, getUser } from '../../lib/searchMessage.js';

export const command: Command = {
    commands: ['unmute'],
    help: 'Unmute a user.',
    minArgs: 1,
    maxArgs: 1,
    expectedArgs: '<@user|userID|username>',
    requiredPermissions: ['KICK_MEMBERS'],
    callback: async (message, args) => {
        const { member, channel } = message;

        const targetMember = await getMember(args[0]).catch(() => undefined);
        const targetUser = targetMember?.user || (await getUser(args[0]).catch(() => undefined));
        if (!targetUser) return sendError(channel, 'The specified user argument is not resolvable.');

        if (targetMember && member.roles.highest.comparePositionTo(targetMember.roles.highest) <= 0)
            return sendError(channel, "You can't unmute a user with a role higher than or equal to yours.", 'Insufficient Permissions');

        try {
            await unmute(targetUser.id, member.id, targetMember);
        } catch (error) {
            return sendError(channel, error);
        }

        sendSuccess(channel, `${parseUser(targetUser)} has been unmuted.`);
    },
};
