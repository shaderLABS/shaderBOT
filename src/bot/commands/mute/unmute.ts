import { Command, syntaxError } from '../../commandHandler.js';
import { sendError, sendSuccess } from '../../lib/embeds.js';
import { unmute } from '../../lib/muteUser.js';

const expectedArgs = '<@user|userID>';

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

        const user = message.mentions.members?.first() || (await member.guild.members.fetch(args[0]).catch(() => undefined));
        if (!user) return syntaxError(channel, 'unmute ' + expectedArgs);

        if (member.roles.highest.comparePositionTo(user.roles.highest) <= 0)
            return sendError(channel, "You can't unmute a user with a role higher than or equal to yours.", 'INSUFFICIENT PERMISSIONS');

        try {
            await unmute(user, member.id);
        } catch (error) {
            return sendError(channel, error);
        }

        sendSuccess(channel, `<@${user.id}> has been unmuted.`);
    },
};
