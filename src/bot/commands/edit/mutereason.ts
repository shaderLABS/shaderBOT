import uuid from 'uuid-random';
import { db } from '../../../db/postgres.js';
import { Command } from '../../commandHandler.js';
import { editMuteReason } from '../../lib/edit/editMute.js';
import { sendError, sendSuccess } from '../../lib/embeds.js';
import { parseUser } from '../../lib/misc.js';
import { removeArgumentsFromText, requireUser } from '../../lib/searchMessage.js';

const expectedArgs = '<uuid|<@user|userID|username>> <content>';

export const command: Command = {
    commands: ['mutereason', 'mr'],
    superCommands: ['edit'],
    help: 'Edit the reason of a mute.',
    minArgs: 2,
    maxArgs: null,
    expectedArgs,
    requiredPermissions: ['KICK_MEMBERS'],
    callback: async (message, args, text) => {
        const { channel, author } = message;

        const content = removeArgumentsFromText(text, args[0]);
        if (content.length < 1 || content.length > 500) return sendError(channel, 'The content must be between 1 and 500 characters long.');

        try {
            if (uuid.test(args[0])) {
                const past_table = !!(await db.query(/*sql*/ `SELECT 1 FROM past_punishment WHERE id = $1;`, [args[0]])).rows[0];
                const { user_id } = await editMuteReason(args[0], content, author.id, past_table);
                sendSuccess(channel, `Successfully edited the reason of ${parseUser(user_id)}'s mute (${args[0]}).`, 'Edit Mute Reason');
            } else {
                const user = await requireUser(args[0], { author, channel });

                const latestMuteID = (
                    await db.query(
                        /*sql*/ `
                        WITH entries AS (
                            (SELECT id, timestamp, 'p' AS db FROM punishment WHERE "type" = 'mute' AND user_id = $1 ORDER BY timestamp DESC LIMIT 1)
                            UNION
                            (SELECT id, timestamp, 'pp' AS db FROM past_punishment WHERE "type" = 'mute' AND user_id = $1 ORDER BY timestamp DESC LIMIT 1)
						)
						SELECT id, db FROM entries ORDER BY timestamp DESC LIMIT 1;`,
                        [user.id]
                    )
                ).rows[0];
                if (!latestMuteID) return sendError(channel, 'The specified user does not have any mutes.');

                await editMuteReason(latestMuteID.id, content, author.id, latestMuteID.db === 'pp');
                sendSuccess(channel, `Successfully edited the reason of ${parseUser(user)}'s mute (${latestMuteID.id}).`, 'Edit Mute Reason');
            }
        } catch (error) {
            if (error) sendError(channel, error);
        }
    },
};
