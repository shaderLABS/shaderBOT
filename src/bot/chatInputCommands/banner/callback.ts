import { EmbedBuilder, GuildPremiumTier } from 'discord.js';
import { db } from '../../../db/postgres.js';
import { ChatInputCommandCallback } from '../../chatInputCommandHandler.js';
import { EmbedColor, EmbedIcon, replyError } from '../../lib/embeds.js';

export const command: ChatInputCommandCallback = {
    callback: async (interaction) => {
        const { guild } = interaction;
        if (guild.premiumTier === GuildPremiumTier.None || guild.premiumTier === GuildPremiumTier.Tier1) return replyError(interaction, 'The banner feature requires a boost level of 2.');

        const currentBannerProject = (
            await db.query(
                /*sql*/ `
                SELECT channel_id
                FROM project
                WHERE banner_last_timestamp IS NOT NULL
                ORDER BY banner_last_timestamp DESC
                LIMIT 1;`,
                []
            )
        ).rows[0];

        const banner = guild.bannerURL({ size: 1024 });
        if (!currentBannerProject || !banner) return replyError(interaction, 'There is no banner at the moment.');

        interaction.reply({
            embeds: [
                new EmbedBuilder({
                    color: EmbedColor.Blue,
                    author: {
                        iconURL: EmbedIcon.Info,
                        name: 'Current Banner',
                    },
                    description: `The current banner was submitted by <#${currentBannerProject.channel_id}>.`,
                    image: {
                        url: banner,
                    },
                }),
            ],
            ephemeral: true,
        });
    },
};
