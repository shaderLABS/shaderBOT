import { Command, syntaxError } from '../../commandHandler.js';
import { sendError, sendSuccess } from '../../lib/embeds.js';
import { client } from '../../bot.js';
import { tempban } from '../../lib/ban.js';
import { GuildMember } from 'discord.js';
import stringToSeconds, { splitString } from '../../lib/stringToSeconds.js';

const expectedArgs = '<@user|userID> <time> ["delete"] [reason]';

export const command: Command = {
    commands: ['tempban'],
    help: 'Ban a user for a specific amount of time.',
    minArgs: 2,
    maxArgs: null,
    expectedArgs,
    requiredPermissions: ['BAN_MEMBERS'],
    callback: async (message, args) => {
        const { member, channel } = message;
        if (!member) return;

        const user =
            message.mentions.members?.first() ||
            (await member.guild.members.fetch(args[0]).catch(() => undefined)) ||
            (await client.users.fetch(args[0]).catch(() => undefined));
        if (!user) return syntaxError(channel, 'ban ' + expectedArgs);

        const deleteMessages = args[2]?.toLowerCase() === 'delete';
        const reason = args.slice(deleteMessages ? 3 : 2).join(' ');
        const time = stringToSeconds(splitString(args[1]));

        if (isNaN(time) || time < 10) {
            sendError(channel, "You can't temp-ban someone for less than 10 seconds.");
            return;
        }

        if (user instanceof GuildMember) {
            if (member.roles.highest.comparePositionTo(user.roles.highest) <= 0)
                return sendError(channel, "You can't temp-ban a user with a role higher than or equal to yours.", 'INSUFFICIENT PERMISSIONS');

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

        sendSuccess(channel, `<@${user.id}> has been temp-banned:\n\`${reason || 'No reason provided.'}\``);
    },
};
