import uuid from 'uuid-random';
import { db } from '../../../db/postgres.js';
import { Command } from '../../commandHandler.js';
import { editBanDuration } from '../../lib/edit/editBan.js';
import { sendError, sendSuccess } from '../../lib/embeds.js';
import { formatTimeDate } from '../../lib/misc.js';
import { getUser } from '../../lib/searchMessage.js';
import { secondsToString, splitString, stringToSeconds } from '../../lib/time.js';

const expectedArgs = '<uuid|<@user|userID|username>> <time>';

export const command: Command = {
    commands: ['banduration', 'bd'],
    superCommands: ['edit'],
    help: 'Edit the duration of a ban.',
    minArgs: 2,
    maxArgs: null,
    expectedArgs,
    requiredPermissions: ['KICK_MEMBERS'],
    callback: async (message, args) => {
        const { channel, author } = message;

        try {
            const time = stringToSeconds(splitString(args[1]));

            if (isNaN(time)) return sendError(channel, 'The specified time exceeds the range of UNIX time.');
            if (time < 10) return sendError(channel, "You can't ban someone for less than 10 seconds.");

            if (uuid.test(args[0])) {
                const { user_id, expire_timestamp } = await editBanDuration(args[0], time, author.id);
                sendSuccess(
                    channel,
                    `Successfully edited the duration of <@${user_id}'s ban (${args[0]}) to ${secondsToString(time)}. They will be unbanned at ${formatTimeDate(new Date(expire_timestamp))}.`
                );
            } else {
                const user = await getUser(args[0]);

                const latestBanID = (await db.query(/*sql*/ `SELECT id FROM punishment WHERE "type" = 'ban' AND user_id = $1 ORDER BY timestamp DESC LIMIT 1`, [user.id])).rows[0];
                if (!latestBanID) return sendError(channel, 'The specified user does not have any active bans.');

                const { expire_timestamp } = await editBanDuration(latestBanID.id, time, author.id);
                sendSuccess(
                    channel,
                    `Successfully edited the duration of <@${user.id}>'s ban (${latestBanID.id}) to ${secondsToString(time)}. They will be unbanned at ${formatTimeDate(new Date(expire_timestamp))}.`
                );
            }
        } catch (error) {
            sendError(channel, error);
        }
    },
};
