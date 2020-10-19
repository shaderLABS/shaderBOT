import { Command, syntaxError } from '../commandHandler.js';
import { sendError, sendSuccess } from '../lib/embeds.js';
import { client } from '../bot.js';
import { unban } from '../lib/ban.js';

const expectedArgs = '<username|userID>';

export const command: Command = {
    commands: ['unban'],
    help: 'Unban a user.',
    minArgs: 1,
    maxArgs: null,
    expectedArgs,
    requiredPermissions: ['BAN_MEMBERS'],
    callback: async (message, args, text) => {
        const { member, channel } = message;
        if (!member) return;

        const user = (await member.guild.fetchBans()).find((ban) => ban.user.username === text)?.user || (await client.users.fetch(args[0]).catch(() => undefined));
        if (!user) return syntaxError(channel, 'unban ' + expectedArgs);

        try {
            await unban(user.id, member.id);
        } catch (error) {
            return sendError(channel, error);
        }

        sendSuccess(channel, `<@${user.id}> has been unbanned.`);
    },
};
