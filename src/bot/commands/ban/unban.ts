import { Command } from '../../commandHandler.js';
import { unban } from '../../lib/banUser.js';
import { sendError, sendSuccess } from '../../lib/embeds.js';
import { parseUser } from '../../lib/misc.js';
import { requireUser } from '../../lib/searchMessage.js';

export const command: Command = {
    commands: ['unban'],
    help: 'Unban a user.',
    minArgs: 1,
    maxArgs: null,
    expectedArgs: '<username|userID>',
    requiredPermissions: ['BAN_MEMBERS'],
    callback: async (message, _, text) => {
        const { member, channel } = message;

        try {
            const user = await requireUser(text, { author: message.author, channel });
            await unban(user.id, member.id);

            sendSuccess(channel, `${parseUser(user)} has been unbanned.`, 'Unban');
        } catch (error) {
            if (error) sendError(channel, error);
        }
    },
};
