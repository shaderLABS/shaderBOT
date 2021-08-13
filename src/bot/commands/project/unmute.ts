import { settings } from '../../bot.js';
import { Command } from '../../commandHandler.js';
import { sendError, sendSuccess } from '../../lib/embeds.js';
import log from '../../lib/log.js';
import { ensureTextChannel, parseUser } from '../../lib/misc.js';
import { isProjectOwner } from '../../lib/project.js';
import { requireUser } from '../../lib/searchMessage.js';

export const command: Command = {
    commands: ['unmute'],
    superCommands: ['project'],
    help: 'Unmute a user in your project channel.',
    expectedArgs: '<@user|userID|username>',
    minArgs: 1,
    maxArgs: null,
    requiredPermissions: ['MANAGE_WEBHOOKS'],
    permissionOverwrites: true,
    callback: async (message, _, text) => {
        const { channel, author } = message;
        if (!ensureTextChannel(channel)) return;

        if (channel.parentId && settings.archiveCategoryIDs.includes(channel.parentId)) return sendError(channel, 'This project is archived.');
        if (!(await isProjectOwner(author.id, channel.id))) return sendError(channel, 'You do not have permission to run this command.');

        try {
            const targetUser = await requireUser(text, { author, channel });

            const currentOverwrite = channel.permissionOverwrites.cache.get(targetUser.id);
            if (!currentOverwrite || !currentOverwrite.deny.has('SEND_MESSAGES') || !currentOverwrite.deny.has('ADD_REACTIONS')) return sendError(channel, 'The specified user is not muted.');

            if (currentOverwrite.allow.equals(0n) && currentOverwrite.deny.equals(['SEND_MESSAGES', 'ADD_REACTIONS'])) currentOverwrite.delete();
            else currentOverwrite.edit({ SEND_MESSAGES: null, ADD_REACTIONS: null });

            log(`${parseUser(author)} unmuted ${parseUser(targetUser)} in their project (<#${channel.id}>).`, 'Unmute');
            sendSuccess(channel, `Successfully unmuted ${parseUser(targetUser)} in this project.`, 'Unmute');
        } catch (error) {
            if (error) sendError(channel, error);
        }
    },
};
