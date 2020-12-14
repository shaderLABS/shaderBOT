import { Command, syntaxError } from '../../commandHandler.js';
import { sendError, sendSuccess } from '../../lib/embeds.js';
import { ban } from '../../lib/banUser.js';
import { GuildMember } from 'discord.js';
import { getMember, getUser } from '../../lib/searchMessage.js';

const expectedArgs = '<@user|userID|username> ["delete"] [reason]';

export const command: Command = {
    commands: ['ban'],
    help: 'Ban a user.',
    minArgs: 1,
    maxArgs: null,
    expectedArgs,
    requiredPermissions: ['BAN_MEMBERS'],
    callback: async (message, args) => {
        const { member, channel } = message;
        if (!member) return;

        // const user =
        //     message.mentions.members?.first() ||
        //     (await member.guild.members.fetch(args[0]).catch(() => undefined)) ||
        //     (await client.users.fetch(args[0]).catch(() => undefined));

        const user = (await getMember(message, args[0]).catch(() => undefined)) || (await getUser(message, args[0]).catch(() => undefined));
        if (!user) return syntaxError(channel, 'ban ' + expectedArgs);

        const deleteMessages = args[1]?.toLowerCase() === 'delete';
        const reason = args.slice(deleteMessages ? 2 : 1).join(' ');
        if (reason.length > 500) return sendError(channel, 'The reason must not be more than 500 characters long.');

        if (user instanceof GuildMember) {
            if (member.roles.highest.comparePositionTo(user.roles.highest) <= 0)
                return sendError(channel, "You can't ban a user with a role higher than or equal to yours.", 'INSUFFICIENT PERMISSIONS');

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
