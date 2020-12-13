import { Command } from '../../commandHandler.js';
import { sendError, sendSuccess } from '../../lib/embeds.js';
import uuid from 'uuid-random';
import { getUser } from '../../lib/searchMessage.js';
import { db } from '../../../db/postgres.js';
import { editMuteReason } from '../../lib/edit/editMute.js';

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

        const content = text.slice(args[0].length).trim();
        if (content.length < 1 || content.length > 500) return sendError(channel, 'The content must be between 1 and 500 characters long.');

        try {
            if (uuid.test(args[0])) {
                const past_table = (await db.query(/*sql*/ `SELECT EXISTS(SELECT 1 FROM past_punishment WHERE id = $1) AS "exists"`, [args[0]])).rows[0]?.exists;
                const { user_id } = await editMuteReason(args[0], content, author.id, past_table);
                sendSuccess(channel, `Successfully edited the reason of <@${user_id}'s mute (${args[0]}).`);
            } else {
                const user = await getUser(message, args[0]);

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
                sendSuccess(channel, `Successfully edited the reason of <@${user.id}>'s mute (${latestMuteID.id}).`);
            }
        } catch (error) {
            sendError(channel, error);
        }
    },
};
