import { Command, syntaxError } from '../../commandHandler.js';
import { editWarnSeverity } from '../../lib/edit/editWarning.js';
import { sendError, sendSuccess } from '../../lib/embeds.js';
import { getWarnUUID } from '../../lib/searchMessage.js';

const expectedArgs = '<uuid|<@user|userID|username>> <"normal"|"severe">';

export const command: Command = {
    commands: ['warnseverity', 'ws'],
    superCommands: ['edit'],
    help: 'Edit the severity of a warning.',
    minArgs: 2,
    maxArgs: null,
    expectedArgs,
    requiredPermissions: ['KICK_MEMBERS'],
    callback: async (message, args) => {
        const { author, channel } = message;

        try {
            const warnUUID = await getWarnUUID(args[0]);

            const severityArg = args[1].toUpperCase();
            if (!['NORMAL', 'SEVERE'].includes(severityArg)) return syntaxError(channel, expectedArgs);
            const severity = severityArg === 'NORMAL' ? 0 : 1;

            try {
                const { expired, expires_in, user_id } = await editWarnSeverity(severity, warnUUID, author.id);
                sendSuccess(
                    channel,
                    `Successfully edited the severity of <@${user_id}>'s warning (${warnUUID}). ${
                        expired ? 'The warning is expired.' : `The warning will expire in ${expires_in} days.`
                    }`
                );
            } catch (error) {
                return sendError(channel, error);
            }
        } catch (error) {
            return sendError(channel, error);
        }
    },
};
