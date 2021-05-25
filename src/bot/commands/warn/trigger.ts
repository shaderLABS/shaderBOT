import { Command } from '../../commandHandler.js';
import automaticPunishment from '../../lib/automaticPunishment.js';
import { sendError, sendSuccess } from '../../lib/embeds.js';
import log from '../../lib/log.js';
import { parseUser } from '../../lib/misc.js';
import { getMember, requireUser } from '../../lib/searchMessage.js';

const actionToString = ['They did not get punished.', 'They have been muted.', 'They have been temporarily banned.', 'They have been permanently banned.'];

export const command: Command = {
    commands: ['trigger'],
    superCommands: ['warn'],
    help: 'Trigger the automatic punishment system for the specified user.',
    minArgs: 1,
    maxArgs: null,
    expectedArgs: '<@user|userID|username>',
    requiredPermissions: ['KICK_MEMBERS'],
    callback: async (message, _, text) => {
        const { channel } = message;

        try {
            const targetMember = await getMember(text, { author: message.author, channel });
            const targetUser = targetMember?.user || (await requireUser(text, { author: message.author, channel }));

            const action = await automaticPunishment(targetUser, targetMember);

            log(`${parseUser(message.author)} triggered the automatic punishment system for ${parseUser(targetUser)}. ${actionToString[action]}`);
            sendSuccess(channel, `Successfully triggered the automatic punishment system for ${parseUser(targetUser)}. ${actionToString[action]}`);
        } catch (error) {
            if (error) sendError(channel, error);
        }
    },
};
