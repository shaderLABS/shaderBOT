import { GuildMember, MessageEmbed } from 'discord.js';
import { db } from '../../../db/postgres.js';
import { Command, syntaxError } from '../../commandHandler.js';
import { sendError } from '../../lib/embeds.js';
import log from '../../lib/log.js';
import { getMember } from '../../lib/searchMessage.js';

export const command: Command = {
    commands: ['setup'],
    superCommands: ['project'],
    help: 'Setup a project linked to the current channel.',
    expectedArgs: '<@user|userID|username> <...>',
    minArgs: 1,
    maxArgs: null,
    requiredPermissions: ['MANAGE_CHANNELS'],
    callback: async (message, args) => {
        const { channel, guild } = message;

        if ((await db.query(/*sql*/ `SELECT EXISTS (SELECT 1 FROM project WHERE channel_id=$1) AS "exists";`, [channel.id])).rows[0].exists)
            return sendError(channel, 'This channel is already linked to a project.');

        let owners: Set<GuildMember> = new Set();
        message.mentions.members?.forEach((member) => owners.add(member));

        for (const potentialID of args) {
            const user = await getMember(potentialID).catch(() => undefined);
            if (user) owners.add(user);
        }

        if (owners.size === 0) return syntaxError(channel, 'project setup <@user|userID|username> <...>');

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

        const role = await guild.roles.create({
            data: {
                name: `${channel.name}`,
                mentionable: false,
            },
            reason: `Create notification role for #${channel.name}.`,
        });

        const insert = await db.query(
            /*sql*/ `
            INSERT INTO project (channel_id, owners, role_id) 
            VALUES ($1, $2, $3) 
            RETURNING id;`,
            [channel.id, [...owners].map((owner) => owner.id), role.id]
        );
        const projectID = insert.rows[0].id;

        channel.send(
            new MessageEmbed()
                .setAuthor(channel.name)
                .setFooter('ID: ' + projectID)
                .setColor('#00ff11')
                .addFields([
                    {
                        name: owners.size > 1 ? 'Owners' : 'Owner',
                        value: [...owners].map((owner) => owner.user.username).join(', '),
                    },
                    {
                        name: 'Notification Role',
                        value: role.toString(),
                    },
                ])
        );
        log(`<@${message.author.id}> created a project linked to <#${channel.id}>.`);
    },
};
