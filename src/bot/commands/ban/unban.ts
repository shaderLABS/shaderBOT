import { Command } from '../../commandHandler.js';
import { unban } from '../../lib/banUser.js';
import { sendError, sendSuccess } from '../../lib/embeds.js';
import { parseUser } from '../../lib/misc.js';
import { getUser } from '../../lib/searchMessage.js';

export const command: Command = {
    commands: ['unban'],
    help: 'Unban a user.',
    minArgs: 1,
    maxArgs: null,
    expectedArgs: '<username|userID>',
    requiredPermissions: ['BAN_MEMBERS'],
    callback: async (message, _, text) => {
        const { member, channel } = message;

        const user = await getUser(text).catch(() => undefined);
        if (!user) return sendError(channel, 'The specified user argument is not resolvable.');

        try {
            await unban(user.id, member.id);
        } catch (error) {
            return sendError(channel, error);
        }

        sendSuccess(channel, `${parseUser(user)} has been unbanned.`);
    },
};
