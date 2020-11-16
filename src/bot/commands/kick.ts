import { Command, syntaxError } from '../commandHandler.js';
import { sendError, sendSuccess } from '../lib/embeds.js';
import { kick } from '../lib/kick.js';

const expectedArgs = '<@user|userID> [reason]';

export const command: Command = {
    commands: ['kick'],
    help: 'Kick a user.',
    minArgs: 1,
    maxArgs: null,
    expectedArgs,
    requiredPermissions: ['KICK_MEMBERS'],
    callback: async (message, args) => {
        const { member, channel } = message;
        if (!member) return;

        const user = message.mentions.members?.first() || (await member.guild.members.fetch(args[0]).catch(() => undefined));
        if (!user) return syntaxError(channel, 'kick ' + expectedArgs);

        const reason = args.slice(1).join(' ');

        if (member.roles.highest.comparePositionTo(user.roles.highest) <= 0)
            return sendError(channel, "You can't kick a user with a role higher than or equal to yours.", 'INSUFFICIENT PERMISSIONS');

        if (!user.kickable) return sendError(channel, 'This user is not kickable.');

        try {
            await kick(user, member.id, reason);
        } catch (error) {
            return sendError(channel, error);
        }

        sendSuccess(channel, `<@${user.id}> has been kicked:\n\`${reason || 'No reason provided.'}\``);
    },
};
