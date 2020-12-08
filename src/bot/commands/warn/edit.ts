import { Command, syntaxError } from '../../commandHandler.js';
import { sendError, sendSuccess } from '../../lib/embeds.js';
import { editWarnReason, editWarnSeverity } from '../../lib/editWarning.js';
import uuid from 'uuid-random';

const expectedArgs = '<"reason"|"severity"> <uuid> <content>';

export const command: Command = {
    commands: ['edit'],
    superCommands: ['warn'],
    help: 'Edit the warn of a user.',
    minArgs: 2,
    maxArgs: null,
    expectedArgs,
    requiredPermissions: ['KICK_MEMBERS'],
    callback: async (message, args, text) => {
        const { member, channel } = message;
        if (!member) return;
        if (!uuid.test(args[1])) return syntaxError(channel, expectedArgs);

        switch (args[0].toLowerCase()) {
            case 'reason':
                const reason = text.substring(text.indexOf(args[1]) + args[1].length).trim();
                if (reason.length > 500) return sendError(channel, 'The reason must not be more than 500 characters long.');

                try {
                    const { user_id } = await editWarnReason(reason, args[1], member.id);
                    sendSuccess(channel, `Successfully edited the reason of <@${user_id}>'s warning (${args[1]}).`);
                } catch (error) {
                    return sendError(channel, error);
                }

                break;
            case 'severity':
                const severityArg = args[2].toUpperCase();
                if (!['NORMAL', 'SEVERE'].includes(severityArg)) return syntaxError(channel, expectedArgs);
                const severity = severityArg === 'NORMAL' ? 0 : 1;

                try {
                    const { expired, expires_in, user_id } = await editWarnSeverity(severity, args[1], member.id);
                    sendSuccess(
                        channel,
                        `Successfully edited the severity of <@${user_id}>'s warning (${args[1]}). ${
                            expired ? 'The warning is expired.' : `The warning will expire in ${expires_in} days.`
                        }`
                    );
                } catch (error) {
                    return sendError(channel, error);
                }
                break;
            default:
                syntaxError(channel, expectedArgs);
                break;
        }
    },
};
