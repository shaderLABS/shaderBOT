import { GuildMember } from 'discord.js';
import { db } from '../../../db/postgres.js';
import { Command, syntaxError } from '../../commandHandler.js';
import { sendError, sendSuccess } from '../../lib/embeds.js';
import log from '../../lib/log.js';
import { getMember } from '../../lib/searchMessage.js';

export const command: Command = {
    commands: ['owners'],
    superCommands: ['project'],
    help: 'Change the owner(s) of the project linked to the current channel.',
    expectedArgs: '<@user|userID|username> <...>',
    minArgs: 1,
    maxArgs: null,
    requiredPermissions: ['MANAGE_CHANNELS'],
    callback: async (message, args) => {
        const { channel } = message;

        let owners: Set<GuildMember> = new Set();
        message.mentions.members?.forEach((member) => owners.add(member));

        for (const potentialID of args) {
            const user = await getMember(potentialID).catch(() => undefined);
            if (user) owners.add(user);
        }

        if (owners.size === 0) return syntaxError(channel, 'project owners <@user|userID|username> <...>');

        const project = await db.query(
            /*sql*/ `
            UPDATE project 
            SET owners = $1 
            FROM project old_project 
            WHERE project.id = old_project.id 
                AND project.channel_id = $2 
            RETURNING old_project.owners::TEXT[] AS old_owners`,
            [[...owners].map((owner) => owner.id), channel.id]
        );

        if (project.rowCount === 0) return sendError(channel, 'This channel is not linked to a project.');
        const oldOwners: string[] = project.rows[0].old_owners;
        channel.overwritePermissions(channel.permissionOverwrites.filter((overwrite) => overwrite.type !== 'member' || !oldOwners.includes(overwrite.id)));

        for (const owner of owners) {
            channel.createOverwrite(owner, {
                // MANAGE_ROLES: true,
                MANAGE_WEBHOOKS: true,
                VIEW_CHANNEL: true,
                SEND_MESSAGES: true,
                MANAGE_MESSAGES: true,
                EMBED_LINKS: true,
                ATTACH_FILES: true,
                READ_MESSAGE_HISTORY: true,
                USE_EXTERNAL_EMOJIS: true,
                ADD_REACTIONS: true,
            });
        }

        sendSuccess(channel, `Updated the channel owners from <@${oldOwners.join('>, <@')}> to ${[...owners].join(', ')}.`);
        log(`<@${message.author.id}> updated the channel owners from <@${oldOwners.join('>, <@')}> to ${[...owners].join(', ')} in <#${channel.id}>.`);
    },
};
