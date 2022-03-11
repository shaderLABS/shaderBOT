import { MessageEmbed, Snowflake, TextChannel } from 'discord.js';
import { db } from '../../../db/postgres.js';
import { settings } from '../../bot.js';
import { GuildCommandInteraction } from '../../events/interactionCreate.js';
import { embedColor, embedIcon } from '../../lib/embeds.js';
import { ApplicationCommandCallback } from '../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: ['MANAGE_CHANNELS'],
    callback: async (interaction: GuildCommandInteraction) => {
        await interaction.deferReply();

        const projectChannels = (await db.query(/*SQL*/ `SELECT channel_id FROM project WHERE role_id IS NOT NULL;`)).rows;
        const eligibleProjectChannelPromises: Promise<Snowflake | undefined>[] = [];

        for (const { channel_id } of projectChannels) {
            const channel = interaction.guild.channels.cache.get(channel_id);
            if (!(channel instanceof TextChannel)) continue;

            eligibleProjectChannelPromises.push(
                channel.messages.fetch({ limit: settings.archive.minimumMessageCount }).then((messages) => {
                    const oldestMessage = messages.last();
                    if (!oldestMessage || Date.now() - oldestMessage.createdTimestamp > settings.archive.maximumMessageAge) return channel.id;
                })
            );
        }

        const eligibleProjectChannels = (await Promise.all(eligibleProjectChannelPromises)).filter(Boolean);

        interaction.editReply({
            embeds: [
                new MessageEmbed({
                    author: {
                        iconURL: embedIcon.info,
                        name: 'Archive Candidates',
                    },
                    color: embedColor.blue,
                    description:
                        eligibleProjectChannels.length === 0
                            ? 'No project channels are currently eligible for archiving.'
                            : eligibleProjectChannels.reduce((prev, curr) => prev + '<#' + curr + '>\n', ''),
                }),
            ],
        });
    },
};
