import { AttachmentBuilder, ChannelType, DataResolver, EmbedBuilder } from 'discord.js';
import sharp from 'sharp';
import { db } from '../../../../../db/postgres.js';
import { settings } from '../../../../bot.js';
import { ChatInputCommandCallback, GuildCommandInteraction } from '../../../../chatInputCommandHandler.js';
import { replyError, replySuccess } from '../../../../lib/embeds.js';
import log from '../../../../lib/log.js';
import { escapeXml, parseUser } from '../../../../lib/misc.js';
import { isProjectOwner } from '../../../../lib/project.js';

export const command: ChatInputCommandCallback = {
    callback: async (interaction: GuildCommandInteraction) => {
        const { channel, user } = interaction;

        if (channel.type !== ChannelType.GuildText) return replyError(interaction, 'This command is only usable in text channels.', 'Invalid Channel');
        if (!(await isProjectOwner(user.id, channel.id))) return replyError(interaction, 'You do not have permission to run this command.', 'Insufficient Permissions');
        if (channel.parentId && settings.data.archive.categoryIDs.includes(channel.parentId)) return replyError(interaction, 'This project is archived.');

        const banner = interaction.options.getAttachment('image', true);
        const label = interaction.options.getBoolean('label', true);
        const labelText = interaction.options.getString('label_text', false)?.trim() || channel.name;

        await interaction.deferReply();

        let bannerURL: string;

        try {
            if (!banner.contentType || !['image/jpeg', 'image/png', 'image/webp'].includes(banner.contentType)) {
                return replyError(interaction, 'Unsupported file type. You must use PNG, JPEG or WebP images.');
            }

            const bannerSharp = sharp((await DataResolver.resolveFile(banner.attachment)).data, { failOnError: false });

            const bannerWidth = 960;
            const bannerHeight = 540;

            bannerSharp.resize(bannerWidth, bannerHeight);

            if (label) {
                const escapedLabelText = escapeXml(labelText);

                const overlayFontAspectRatio = 0.55;
                const overlayMaxFontSize = 58;

                const overlayFontSize = (bannerWidth - 80) / overlayFontAspectRatio / Math.max(labelText.length + 2, Math.ceil((bannerWidth + 80) / overlayFontAspectRatio / overlayMaxFontSize));

                const overlayHeight = overlayFontSize * 1.35;
                const overlayWidth = Math.min(bannerWidth, 30 + overlayFontSize * overlayFontAspectRatio * (labelText.length + 2));

                const overlay = Buffer.from(
                    `<svg width="${overlayWidth}" height="${overlayHeight}">
                        <rect x="0" y="0" width="100%" height="100%" style="fill: rgba(0, 0, 0, 50%)" />
                        <text x="50%" y="100%" dy="-0.30em" text-anchor="middle" font-family="Consolas" font-size="${overlayFontSize}" font-style="normal" font-weight="900" style="fill: black">#${escapedLabelText};</text>
                        <text x="50%" y="100%" dy="-0.35em" text-anchor="middle" font-family="Consolas" font-size="${overlayFontSize}" font-style="normal" font-weight="900"><tspan style="fill: #b676c7">#</tspan><tspan style="fill: #63b1dc">${escapedLabelText}</tspan><tspan style="fill: #afb2bc">;</tspan></text>
                    </svg>`
                );

                bannerSharp.composite([{ input: overlay, top: Math.round(bannerHeight - 20.0 - overlayHeight), left: Math.round((bannerWidth - overlayWidth) * 0.5) }]);
            }

            const reply = await channel.send({
                files: [new AttachmentBuilder(await bannerSharp.toBuffer())],
            });

            const cachedAttachmentURL = reply.attachments.first()?.url;
            if (!cachedAttachmentURL) throw new Error('Failed to cache attachment.');
            bannerURL = cachedAttachmentURL;
        } catch (error) {
            console.error(error);
            return replyError(interaction, 'Failed to process and cache the banner image.');
        }

        await db.query(/*sql*/ `UPDATE project SET banner_url = $1 WHERE channel_id = $2;`, [bannerURL, channel.id]);

        replySuccess(interaction, 'Successfully set the banner image.');
        log(
            new EmbedBuilder({
                title: 'Set Project Banner',
                description: `${parseUser(interaction.user)} set the banner image of their project <#${channel.id}>.`,
                image: { url: bannerURL },
            })
        );
    },
};