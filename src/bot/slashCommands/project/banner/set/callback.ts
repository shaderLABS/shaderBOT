import { MessageAttachment } from 'discord.js';
import fetch from 'node-fetch';
import sharp from 'sharp';
import { pipeline } from 'stream/promises';
import { db } from '../../../../../db/postgres.js';
import { settings } from '../../../../bot.js';
import { GuildCommandInteraction } from '../../../../events/interactionCreate.js';
import { replyError, replySuccess } from '../../../../lib/embeds.js';
import log from '../../../../lib/log.js';
import { ensureTextChannel, isValidUrl, parseUser } from '../../../../lib/misc.js';
import { isProjectOwner } from '../../../../lib/project.js';
import { ApplicationCommandCallback } from '../../../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    callback: async (interaction: GuildCommandInteraction) => {
        const { channel, user } = interaction;

        if (!ensureTextChannel(channel, interaction) || !(await isProjectOwner(user.id, channel.id))) return replyError(interaction, 'You do not have permission to run this command.', 'Insufficient Permissions');
        if (channel.parentId && settings.archive.categoryIDs.includes(channel.parentId)) return replyError(interaction, 'This project is archived.');

        let banner = interaction.options.getString('url', true);
        const label = interaction.options.getBoolean('label', true);
        const labelText = interaction.options.getString('label_text', false)?.trim() || channel.name;

        if (!isValidUrl(banner)) return replyError(interaction, 'The specified URL is invalid.');

        await interaction.deferReply();

        try {
            const bannerRequest = await fetch(banner, { size: 8388608 });
            const bannerContentType = bannerRequest.headers.get('content-type');
            if (!bannerContentType || !['image/jpeg', 'image/png', 'image/webp'].includes(bannerContentType)) {
                return replyError(interaction, 'Unsupported file type. You must use PNG, JPEG or WebP images.');
            }

            const bannerSharp = sharp({ failOnError: false });
            pipeline(bannerRequest.body, bannerSharp);

            const bannerWidth = 960;
            const bannerHeight = 540;

            bannerSharp.resize(bannerWidth, bannerHeight);

            if (label) {
                const overlayFontAspectRatio = 0.55;
                const overlayMaxFontSize = 58;

                const overlayFontSize = (bannerWidth - 20) / overlayFontAspectRatio / Math.max(labelText.length + 2, Math.ceil((bannerWidth + 20) / overlayFontAspectRatio / overlayMaxFontSize));
                const overlay = Buffer.from(
                    `<svg width="${bannerWidth}" height="${overlayFontSize * 1.35}">
                        <rect x="${bannerWidth - 30 - overlayFontSize * overlayFontAspectRatio * (labelText.length + 2)}" y="0" width="150%" height="100%" style="fill: rgba(0, 0, 0, 50%)" />
                        <text x="100%" y="100%" dx="-7.50" dy="-.30em" text-anchor="end" font-family="Consolas" font-size="${overlayFontSize}" font-style="normal" font-weight="900" style="fill: black">#${labelText};</text>
                        <text x="100%" y="100%" dx="-10.0" dy="-.35em" text-anchor="end" font-family="Consolas" font-size="${overlayFontSize}" font-style="normal" font-weight="900"><tspan style="fill: #b676c7">#</tspan><tspan style="fill: #63b1dc">${labelText}</tspan><tspan style="fill: #afb2bc">;</tspan></text>
                    </svg>`
                );

                bannerSharp.composite([{ input: overlay, gravity: 'south' }]);
            }

            const reply = await channel.send({
                files: [new MessageAttachment(await bannerSharp.toBuffer())],
            });

            const cachedAttachmentURL = reply.attachments.first()?.url;
            if (!cachedAttachmentURL) throw new Error();
            banner = cachedAttachmentURL;
        } catch (error) {
            return replyError(interaction, 'Failed to process and cache the banner image. Make sure that it is smaller than 8 MB.');
        }

        await db.query(/*sql*/ `UPDATE project SET banner_url = $1 WHERE channel_id = $2;`, [banner, channel.id]);

        replySuccess(interaction, 'Successfully set the banner image.');
        log(`${parseUser(interaction.user)} set the banner image of their project <#${channel.id}> to: ${banner}`);
    },
};
