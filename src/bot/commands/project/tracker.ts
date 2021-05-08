import { URL } from 'url';
import { db } from '../../../db/postgres.js';
import { settings } from '../../bot.js';
import { Command } from '../../commandHandler.js';
import { sendError, sendSuccess } from '../../lib/embeds.js';
import log from '../../lib/log.js';
import { parseUser } from '../../lib/misc.js';

function isValidURL(test: string) {
    let url;

    try {
        url = new URL(test);
    } catch {
        return false;
    }

    return url.protocol === 'http:' || url.protocol === 'https:';
}

export const command: Command = {
    commands: ['tracker'],
    superCommands: ['project'],
    help: 'Set or remove an URL to an external issue tracker, which disables the inbuilt one.',
    expectedArgs: '[issueTrackerURL]',
    minArgs: 0,
    maxArgs: null,
    requiredPermissions: ['MANAGE_WEBHOOKS'],
    permissionOverwrites: true,
    callback: async (message, _, text) => {
        const { channel, author } = message;
        if (channel.parentID && settings.archiveCategoryIDs.includes(channel.parentID)) return sendError(channel, 'This project is archived.');

        const project = (await db.query(/*sql*/ `SELECT id FROM project WHERE channel_id = $1 AND $2 = ANY (owners) LIMIT 1;`, [channel.id, author.id])).rows[0];
        if (!project) return sendError(channel, 'You do not have permission to run this command.');

        if (text && !isValidURL(text)) return sendError(channel, 'Invalid URL.');

        await db.query(/*sql*/ `UPDATE project SET issue_tracker_url = $1 WHERE id = $2`, [text || null, project.id]);

        log(
            text
                ? `${parseUser(author)} set the issue tracker URL in their project (<#${channel.id}>) to ${text}.`
                : `${parseUser(author)} removed the issue tracker URL from their project (<#${channel.id}>).`
        );
        sendSuccess(channel, `Successfully ${text ? 'set' : 'removed'} the issue tracker URL.`);
    },
};
