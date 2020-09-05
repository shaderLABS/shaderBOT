import { Command, syntaxError } from '../../commandHandler.js';
import { Message, TextChannel, MessageEmbed, GuildMember } from 'discord.js';
import log from '../../lib/log.js';
import { sendError } from '../../lib/embeds.js';
import { db } from '../../../db/postgres.js';

export const command: Command = {
    commands: ['setup'],
    help: 'Setup a project linked to the current channel.',
    expectedArgs: '<@user|userID> <...>',
    minArgs: 1,
    maxArgs: null,
    superCommands: ['project'],
    requiredPermissions: ['MANAGE_CHANNELS'],
    callback: async (message: Message, args: string[]) => {
        const { channel, guild } = message;
        if (!guild || !(channel instanceof TextChannel)) return;

        if ((await db.query(/*sql*/ `SELECT EXISTS (SELECT 1 FROM project WHERE channel_id=$1) AS "exists";`, [channel.id])).rows[0].exists)
            return sendError(channel, 'This channel is already linked to a project.');

        let owners: GuildMember[] = [];

        const mentionedMembers = message.mentions.members;
        if (mentionedMembers) owners = owners.concat(mentionedMembers.array());

        for (const potentialID of args) {
            if (!isNaN(Number(potentialID))) {
                const user = await guild.members.fetch(potentialID);
                if (user) owners.push(user);
            }
        }

        if (owners.length === 0) return syntaxError(channel, 'project setup <@user|userID> <...>');

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
            [channel.id, owners.map((owner) => owner.id), role.id]
        );
        const projectID = insert.rows[0].id;

        channel.send(
            new MessageEmbed()
                .setAuthor(channel.name)
                .setFooter('ID: ' + projectID)
                .setColor('#00ff11')
                .addFields([
                    {
                        name: owners.length > 1 ? 'Owners' : 'Owner',
                        value: owners.map((owner) => owner.user.username).join(', '),
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
