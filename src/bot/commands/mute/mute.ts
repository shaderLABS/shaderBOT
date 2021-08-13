import { Command } from '../../commandHandler.js';
import { sendError, sendSuccess } from '../../lib/embeds.js';
import { parseUser } from '../../lib/misc.js';
import { mute } from '../../lib/muteUser.js';
import { getMember, removeArgumentsFromText, requireUser } from '../../lib/searchMessage.js';
import { formatTimeDate, secondsToString, splitString, stringToSeconds } from '../../lib/time.js';

export const command: Command = {
    commands: ['mute'],
    help: 'Mute a user for a specified amount of time.',
    minArgs: 2,
    maxArgs: null,
    expectedArgs: '<@user|userID|username> <time> [reason]',
    requiredPermissions: ['KICK_MEMBERS'],
    callback: async (message, args, text) => {
        const { member, channel } = message;

        const reason = removeArgumentsFromText(text, args[1]);
        if (reason.length > 500) return sendError(channel, 'The reason must not be more than 500 characters long.');

        try {
            const targetMember = await getMember(args[0], { author: message.author, channel });
            const targetUser = targetMember?.user || (await requireUser(args[0], { author: message.author, channel }));

            if (targetMember && member.roles.highest.comparePositionTo(targetMember.roles.highest) <= 0)
                return sendError(channel, "You can't mute a user with a role higher than or equal to yours.", 'Insufficient Permissions');

            const time = stringToSeconds(splitString(args[1]));

            if (isNaN(time)) return sendError(channel, 'The specified time exceeds the range of UNIX time.');
            if (time < 10) return sendError(channel, "You can't mute someone for less than 10 seconds.");

            const { expire, dmed } = await mute(targetUser.id, time, member.id, reason, targetMember);
            sendSuccess(
                channel,
                `${parseUser(targetUser)} has been muted for ${secondsToString(time)} (until ${formatTimeDate(expire)}):\n\`${reason || 'No reason provided.'}\`${
                    dmed ? '' : '\n\n*The target could not be DMed.*'
                }`,
                'Mute'
            );
        } catch (error) {
            if (error) sendError(channel, error);
        }
    },
};
