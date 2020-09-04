import { Command, syntaxError } from '../../commandHandler.js';
import { Message, TextChannel, GuildMember } from 'discord.js';
import log from '../../lib/log.js';
import { sendError, sendSuccess } from '../../lib/embeds.js';
import { db } from '../../../db/postgres.js';

export const command: Command = {
    commands: ['owners'],
    help: 'Change the owner(s) of the project linked to the current channel.',
    expectedArgs: '<@user|userID> <...>',
    minArgs: 1,
    maxArgs: null,
    superCommands: ['project'],
    requiredPermissions: ['MANAGE_CHANNELS'],
    callback: async (message: Message, args: string[]) => {
        const { channel, guild } = message;
        if (!guild || !(channel instanceof TextChannel)) return;

        let owners: GuildMember[] = [];

        const mentionedMembers = message.mentions.members;
        if (mentionedMembers) owners = owners.concat(mentionedMembers.array());

        for (const potentialID of args) {
            if (!isNaN(Number(potentialID))) {
                const user = await guild.members.fetch(potentialID);
                if (user) owners.push(user);
            }
        }

        if (owners.length === 0) return syntaxError(channel, 'project owners <@user|userID> <...>');

        const project = await db.query(
            /*sql*/ `
            UPDATE project 
            SET owners = $1 
            FROM project old_project 
            WHERE project.project_id = old_project.project_id 
                AND project.channel_id = $2 
            RETURNING old_project.owners::TEXT[] AS old_owners`,
            [owners.map((owner) => owner.id), channel.id]
        );

        if (project.rowCount === 0) return sendError(channel, 'This channel is not linked to a project.');
        const oldOwners: string[] = project.rows[0].old_owners;
        channel.overwritePermissions(channel.permissionOverwrites.filter((overwrite) => overwrite.type !== 'member' || !oldOwners.includes(overwrite.id)));

        for (const owner of owners) {
            channel.createOverwrite(owner, {
                MANAGE_CHANNELS: true,
                MANAGE_ROLES: true,
                MANAGE_WEBHOOKS: true,
                VIEW_CHANNEL: true,
                SEND_MESSAGES: true,
                SEND_TTS_MESSAGES: true,
                MANAGE_MESSAGES: true,
                EMBED_LINKS: true,
                ATTACH_FILES: true,
                READ_MESSAGE_HISTORY: true,
            });
        }

        sendSuccess(channel, `Updated the channel owners from <@${oldOwners.join('>, <@')}> to ${owners.join(', ')}.`);
        log(`<@${message.author.id}> updated the channel owners from <@${oldOwners.join('>, <@')}> to ${owners.join(', ')} in <#${channel.id}>.`);
    },
};
