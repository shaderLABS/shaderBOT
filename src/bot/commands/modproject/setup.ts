import { GuildMember, MessageEmbed, Util } from 'discord.js';
import { db } from '../../../db/postgres.js';
import { settings } from '../../bot.js';
import { Command, syntaxError } from '../../commandHandler.js';
import { embedColor, sendError } from '../../lib/embeds.js';
import log from '../../lib/log.js';
import { parseUser } from '../../lib/misc.js';
import { ownerOverwrites } from '../../lib/project.js';
import { getMember } from '../../lib/searchMessage.js';

const expectedArgs = '<@user|userID|username> [...]';

export const command: Command = {
    commands: ['setup'],
    superCommands: ['modproject', 'mproject'],
    help: 'Setup a project linked to the current channel.',
    expectedArgs,
    minArgs: 1,
    maxArgs: null,
    requiredPermissions: ['MANAGE_CHANNELS'],
    callback: async (message, args) => {
        const { channel, guild } = message;
        if (channel.parentID && settings.archiveCategoryIDs.includes(channel.parentID)) return sendError(channel, 'This channel is archived.');

        if ((await db.query(/*sql*/ `SELECT 1 FROM project WHERE channel_id = $1;`, [channel.id])).rows[0]) return sendError(channel, 'This channel is already linked to a project.');

        let owners: Set<GuildMember> = new Set();

        for (const potentialID of args) {
            const user = await getMember(potentialID);
            if (user) owners.add(user);
        }

        if (owners.size === 0) return syntaxError(channel, 'project setup ' + expectedArgs);

        for (const owner of owners) {
            channel.createOverwrite(owner, ownerOverwrites);
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
                .setColor(embedColor.green)
                .addFields([
                    {
                        name: owners.size > 1 ? 'Owners' : 'Owner',
                        value: [...owners].map((owner) => Util.escapeMarkdown(owner.user.tag)).join(', '),
                    },
                    {
                        name: 'Notification Role',
                        value: role.toString(),
                    },
                ])
        );
        log(`${parseUser(message.author)} created a project linked to <#${channel.id}>.`);
    },
};
