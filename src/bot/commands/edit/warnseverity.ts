import { Command, syntaxError } from '../../commandHandler.js';
import { editWarnSeverity, getWarnUUID } from '../../lib/edit/editWarning.js';
import { sendError, sendSuccess } from '../../lib/embeds.js';

const expectedArgs = '<uuid|<@user|userID|username>> <severity>';

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

            const severity = Number.parseInt(args[1]);
            if (severity < 0 || severity > 3) return sendError(channel, 'The severity must be an integer between 0 and 3.');

            try {
                const userID = await editWarnSeverity(severity, warnUUID, author.id);
                sendSuccess(channel, `Successfully edited the severity of <@${userID}>'s warning (${warnUUID}).`);
            } catch (error) {
                return sendError(channel, error);
            }
        } catch (error) {
            return sendError(channel, error);
        }
    },
};
