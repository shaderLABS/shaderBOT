import { GuildMember } from 'discord.js';
import { Command, syntaxError } from '../../commandHandler.js';
import { sendError, sendSuccess } from '../../lib/embeds.js';
import { mute } from '../../lib/muteUser.js';
import { getMember, getUser } from '../../lib/searchMessage.js';
import stringToSeconds, { splitString } from '../../lib/stringToSeconds.js';

const expectedArgs = '<@user|userID|username> <time> [reason]';

export const command: Command = {
    commands: ['mute'],
    help: 'Mute a user for a specified amount of time.',
    minArgs: 2,
    maxArgs: null,
    expectedArgs,
    requiredPermissions: ['KICK_MEMBERS'],
    callback: async (message, args) => {
        const { member, channel } = message;
        if (!member) return;

        const reason = args.slice(2).join(' ');
        if (reason.length > 500) return sendError(channel, 'The reason must not be more than 500 characters long.');

        const user = (await getMember(message, args[0]).catch(() => undefined)) || (await getUser(message, args[0]).catch(() => undefined));
        if (!user) return syntaxError(channel, 'mute ' + expectedArgs);

        if (user instanceof GuildMember && member.roles.highest.comparePositionTo(user.roles.highest) <= 0)
            return sendError(channel, "You can't mute a user with a role higher than or equal to yours.", 'INSUFFICIENT PERMISSIONS');

        const time = stringToSeconds(splitString(args[1]));

        if (isNaN(time)) return sendError(channel, 'The specified time exceeds the range of UNIX time.');
        if (time < 10) return sendError(channel, "You can't mute someone for less than 10 seconds.");

        const expire = user instanceof GuildMember ? await mute(user.id, time, member.id, reason, user) : await mute(user.id, time, member.id, reason);
        sendSuccess(channel, `<@${user.id}> has been muted for ${time} seconds (until ${expire.toLocaleString()}):\n\`${reason || 'No reason provided.'}\``);
    },
};
