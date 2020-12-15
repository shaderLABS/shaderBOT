import { GuildMember } from 'discord.js';
import { Command, syntaxError } from '../../commandHandler.js';
import { sendError, sendSuccess } from '../../lib/embeds.js';
import { unmute } from '../../lib/muteUser.js';
import { getMember, getUser } from '../../lib/searchMessage.js';

const expectedArgs = '<@user|userID|username>';

export const command: Command = {
    commands: ['unmute'],
    help: 'Unmute a user.',
    minArgs: 1,
    maxArgs: 1,
    expectedArgs,
    requiredPermissions: ['KICK_MEMBERS'],
    callback: async (message, args) => {
        const { member, channel } = message;
        if (!member) return;

        const user = (await getMember(args[0], message.mentions).catch(() => undefined)) || (await getUser(args[0], message.mentions).catch(() => undefined));
        if (!user) return syntaxError(channel, 'unmute ' + expectedArgs);

        if (user instanceof GuildMember && member.roles.highest.comparePositionTo(user.roles.highest) <= 0)
            return sendError(channel, "You can't unmute a user with a role higher than or equal to yours.", 'INSUFFICIENT PERMISSIONS');

        try {
            await unmute(user.id, member.id);
        } catch (error) {
            return sendError(channel, error);
        }

        sendSuccess(channel, `<@${user.id}> has been unmuted.`);
    },
};
