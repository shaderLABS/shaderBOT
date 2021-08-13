import { Command } from '../../commandHandler.js';
import { editWarnReason, getWarnUUID } from '../../lib/edit/editWarning.js';
import { sendError, sendSuccess } from '../../lib/embeds.js';
import { parseUser } from '../../lib/misc.js';
import { removeArgumentsFromText } from '../../lib/searchMessage.js';

const expectedArgs = '<uuid|<@user|userID|username>> <content>';

export const command: Command = {
    commands: ['warnreason', 'wr'],
    superCommands: ['edit'],
    help: 'Edit the reason of a warning.',
    minArgs: 2,
    maxArgs: null,
    expectedArgs,
    requiredPermissions: ['KICK_MEMBERS'],
    callback: async (message, args, text) => {
        const { author, channel } = message;

        try {
            const warnUUID = await getWarnUUID(args[0], author, channel);

            const reason = removeArgumentsFromText(text, args[0]);
            if (reason.length > 500) return sendError(channel, 'The reason must not be more than 500 characters long.');

            const { user_id } = await editWarnReason(reason, warnUUID, author.id);
            sendSuccess(channel, `Successfully edited the reason of ${parseUser(user_id)}'s warning (${warnUUID}).`, 'Edit Warning Reason');
        } catch (error) {
            if (error) sendError(channel, error);
        }
    },
};
