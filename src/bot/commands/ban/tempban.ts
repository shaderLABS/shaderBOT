import { Command } from '../../commandHandler.js';
import { tempban } from '../../lib/banUser.js';
import { sendError, sendSuccess } from '../../lib/embeds.js';
import { parseUser } from '../../lib/misc.js';
import { getMember, removeArgumentsFromText, requireUser } from '../../lib/searchMessage.js';
import { splitString, stringToSeconds } from '../../lib/time.js';

export const command: Command = {
    commands: ['tempban'],
    help: 'Ban a user for a specific amount of time.',
    minArgs: 2,
    maxArgs: null,
    expectedArgs: '<@user|userID|username> <time> ["delete"] [reason]',
    requiredPermissions: ['BAN_MEMBERS'],
    callback: async (message, args, text) => {
        const { member, channel } = message;

        try {
            const targetMember = await getMember(args[0], { author: message.author, channel });
            const targetUser = targetMember?.user || (await requireUser(args[0], { author: message.author, channel }));

            const deleteMessages = args[2]?.toLowerCase() === 'delete';
            const reason = removeArgumentsFromText(text, args[deleteMessages ? 2 : 1]);
            if (reason.length > 500) return sendError(channel, 'The reason must not be more than 500 characters long.');

            const time = stringToSeconds(splitString(args[1]));

            if (isNaN(time)) return sendError(channel, 'The specified time exceeds the range of UNIX time.');
            if (time < 10) return sendError(channel, "You can't temporarily ban someone for less than 10 seconds.");

            if (targetMember) {
                if (member.roles.highest.comparePositionTo(targetMember.roles.highest) <= 0)
                    return sendError(channel, "You can't temporarily ban a user with a role higher than or equal to yours.", 'Insufficient Permissions');

                if (!targetMember.bannable) return sendError(channel, 'This user is not bannable.');
            }

            const { dmed } = await tempban(targetUser, time, member.id, reason, deleteMessages);

            sendSuccess(channel, `${parseUser(targetUser)} has been temporarily banned:\n\`${reason || 'No reason provided.'}\`${dmed ? '' : '\n\n*The target could not be DMed.*'}`, 'Temporary Ban');
        } catch (error) {
            if (error) sendError(channel, error);
        }
    },
};
