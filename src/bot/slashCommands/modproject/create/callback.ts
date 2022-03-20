import { MessageEmbed } from 'discord.js';
import { db } from '../../../../db/postgres.js';
import { settings } from '../../../bot.js';
import { GuildCommandInteraction } from '../../../events/interactionCreate.js';
import { embedColor, replyError } from '../../../lib/embeds.js';
import log from '../../../lib/log.js';
import { ensureTextChannel, parseUser } from '../../../lib/misc.js';
import { isProject } from '../../../lib/project.js';
import { ApplicationCommandCallback } from '../../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: ['MANAGE_CHANNELS'],
    callback: async (interaction: GuildCommandInteraction) => {
        const { channel, guild } = interaction;
        if (!ensureTextChannel(channel, interaction)) return replyError(interaction, 'You can not turn thread channels into projects.');

        if (channel.parentId && settings.archive.categoryIDs.includes(channel.parentId)) return replyError(interaction, 'This channel is archived.');
        if (await isProject(channel.id)) return replyError(interaction, 'This channel is already linked to a project.');

        const role = await guild.roles.create({
            name: channel.name,
            mentionable: false,
            reason: `Create notification role for #${channel.name}.`,
        });

        const projectID = (
            await db.query(
                /*sql*/ `
                INSERT INTO project (channel_id, owners, role_id)
                VALUES ($1, $2, $3)
                RETURNING id;`,
                [channel.id, [], role.id]
            )
        ).rows[0].id;

        interaction.reply({
            embeds: [
                new MessageEmbed()
                    .setAuthor({ name: channel.name })
                    .setFooter({ text: 'ID: ' + projectID })
                    .setColor(embedColor.green)
                    .addField('Notification Role', role.toString()),
            ],
        });
        log(`${parseUser(interaction.user)} created a project linked to <#${channel.id}>.`, 'Create Project');
    },
};
