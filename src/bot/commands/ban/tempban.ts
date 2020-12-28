import { GuildMember } from 'discord.js';
import { Command, syntaxError } from '../../commandHandler.js';
import { tempban } from '../../lib/banUser.js';
import { sendError, sendSuccess } from '../../lib/embeds.js';
import { getMember, getUser, removeArgumentsFromText } from '../../lib/searchMessage.js';
import stringToSeconds, { splitString } from '../../lib/stringToSeconds.js';

const expectedArgs = '<@user|userID|username> <time> ["delete"] [reason]';

export const command: Command = {
    commands: ['tempban'],
    help: 'Ban a user for a specific amount of time.',
    minArgs: 2,
    maxArgs: null,
    expectedArgs,
    requiredPermissions: ['BAN_MEMBERS'],
    callback: async (message, args, text) => {
        const { member, channel } = message;

        const user = (await getMember(args[0]).catch(() => undefined)) || (await getUser(args[0]).catch(() => undefined));
        if (!user) return syntaxError(channel, 'ban ' + expectedArgs);

        const deleteMessages = args[2]?.toLowerCase() === 'delete';
        const reason = removeArgumentsFromText(text, args[deleteMessages ? 2 : 1]);
        if (reason.length > 500) return sendError(channel, 'The reason must not be more than 500 characters long.');
        const time = stringToSeconds(splitString(args[1]));

        if (isNaN(time)) return sendError(channel, 'The specified time exceeds the range of UNIX time.');
        if (time < 10) return sendError(channel, "You can't temporarily ban someone for less than 10 seconds.");

        if (user instanceof GuildMember) {
            if (member.roles.highest.comparePositionTo(user.roles.highest) <= 0)
                return sendError(channel, "You can't temporarily ban a user with a role higher than or equal to yours.", 'Insufficient Permissions');

            if (!user.bannable) return sendError(channel, 'This user is not bannable.');

            try {
                await tempban(user.user, time, member.id, reason, deleteMessages);
            } catch (error) {
                return sendError(channel, error);
            }
        } else {
            try {
                await tempban(user, time, member.id, reason, deleteMessages);
            } catch (error) {
                return sendError(channel, error);
            }
        }

        sendSuccess(channel, `<@${user.id}> has been temporarily banned:\n\`${reason || 'No reason provided.'}\``);
    },
};
