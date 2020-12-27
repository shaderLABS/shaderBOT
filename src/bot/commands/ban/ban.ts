import { GuildMember } from 'discord.js';
import { Command, syntaxError } from '../../commandHandler.js';
import { ban } from '../../lib/banUser.js';
import { sendError, sendSuccess } from '../../lib/embeds.js';
import { getMember, getUser, removeArgumentsFromText } from '../../lib/searchMessage.js';

const expectedArgs = '<@user|userID|username> ["delete"] [reason]';

export const command: Command = {
    commands: ['ban'],
    help: 'Ban a user.',
    minArgs: 1,
    maxArgs: null,
    expectedArgs,
    requiredPermissions: ['BAN_MEMBERS'],
    callback: async (message, args, text) => {
        const { member, channel } = message;

        const user = (await getMember(args[0], message.mentions).catch(() => undefined)) || (await getUser(args[0], message.mentions).catch(() => undefined));
        if (!user) return syntaxError(channel, 'ban ' + expectedArgs);

        const deleteMessages = args[1]?.toLowerCase() === 'delete';
        const reason = removeArgumentsFromText(text, args[deleteMessages ? 1 : 0]);
        if (reason.length > 500) return sendError(channel, 'The reason must not be more than 500 characters long.');

        if (user instanceof GuildMember) {
            if (member.roles.highest.comparePositionTo(user.roles.highest) <= 0)
                return sendError(channel, "You can't ban a user with a role higher than or equal to yours.", 'Insufficient Permissions');

            if (!user.bannable) return sendError(channel, 'This user is not bannable.');

            try {
                await ban(user.user, member.id, reason, deleteMessages);
            } catch (error) {
                return sendError(channel, error);
            }
        } else {
            try {
                await ban(user, member.id, reason, deleteMessages);
            } catch (error) {
                return sendError(channel, error);
            }
        }

        sendSuccess(channel, `<@${user.id}> has been banned:\n\`${reason || 'No reason provided.'}\``);
    },
};
