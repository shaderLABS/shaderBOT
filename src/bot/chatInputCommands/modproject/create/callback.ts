import { ChannelType, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { db } from '../../../../db/postgres.js';
import { settings } from '../../../bot.js';
import { ChatInputCommandCallback, GuildCommandInteraction } from '../../../chatInputCommandHandler.js';
import { EmbedColor, replyError } from '../../../lib/embeds.js';
import log from '../../../lib/log.js';
import { parseUser } from '../../../lib/misc.js';
import { isProject } from '../../../lib/project.js';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.ManageChannels,
    callback: async (interaction: GuildCommandInteraction) => {
        const { channel, guild } = interaction;
        if (channel.type !== ChannelType.GuildText) return replyError(interaction, 'This command is only usable in text channels.', 'Invalid Channel');

        if (channel.parentId && settings.data.archive.categoryIDs.includes(channel.parentId)) return replyError(interaction, 'This channel is archived.');
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
                new EmbedBuilder()
                    .setAuthor({ name: channel.name })
                    .setFooter({ text: 'ID: ' + projectID })
                    .setColor(EmbedColor.Green)
                    .addFields([{ name: 'Notification Role', value: role.toString() }]),
            ],
        });
        log(`${parseUser(interaction.user)} created a project linked to <#${channel.id}>.`, 'Create Project');
    },
};
