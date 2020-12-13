import { Command } from '../../commandHandler.js';
import { sendError, sendSuccess } from '../../lib/embeds.js';
import uuid from 'uuid-random';
import { getUser } from '../../lib/searchMessage.js';
import { db } from '../../../db/postgres.js';
import { editKick } from '../../lib/edit/editKick.js';

const expectedArgs = '<uuid|<@user|userID|username>> <content>';

export const command: Command = {
    commands: ['kick', 'k'],
    superCommands: ['edit'],
    help: 'Edit the reason of a kick.',
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
                const { user_id } = await editKick(args[0], content, author.id);
                sendSuccess(channel, `Successfully edited the reason of <@${user_id}'s kick (${args[0]}).`);
            } else {
                const user = await getUser(message, args[0]);

                const latestKickID = (
                    await db.query(/*sql*/ `SELECT id FROM past_punishment WHERE "type" = 'kick' AND user_id = $1 ORDER BY timestamp DESC LIMIT 1`, [user.id])
                ).rows[0];
                if (!latestKickID) return sendError(channel, 'The specified user does not have any kicks.');

                await editKick(latestKickID.id, content, author.id);
                sendSuccess(channel, `Successfully edited the reason of <@${user.id}>'s kick (${latestKickID.id}).`);
            }
        } catch (error) {
            sendError(channel, error);
        }
    },
};
