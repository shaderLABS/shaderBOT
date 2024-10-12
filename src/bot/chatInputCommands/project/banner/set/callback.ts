import { AttachmentBuilder, EmbedBuilder, resolveFile } from 'discord.js';
import sharp from 'sharp';
import type { ChatInputCommandCallback } from '../../../../chatInputCommandHandler.ts';
import { EmbedColor, EmbedIcon, replyError } from '../../../../lib/embeds.ts';
import { escapeXml, parseUser } from '../../../../lib/misc.ts';
import { Project } from '../../../../lib/project.ts';

export const command: ChatInputCommandCallback = {
    callback: async (interaction) => {
        try {
            const project = await Project.getByChannelID(interaction.channelId);
            project.assertOwner(interaction.user.id).assertNotArchived();

            const { channel } = interaction;

            const banner = interaction.options.getAttachment('image', true);
            const label = interaction.options.getBoolean('label', true);
            const labelText = interaction.options.getString('label_text', false)?.trim() || channel.name;

            if (!['image/jpeg', 'image/png', 'image/webp'].includes(banner.contentType || '')) {
                replyError(interaction, 'Unsupported file type. You must use PNG, JPEG or WebP images.');
                return;
            }

            const bannerMessageID = (await interaction.deferReply({ fetchReply: true })).id;

            try {
                const bannerSharp = sharp((await resolveFile(banner.url)).data, { failOnError: false });

                const bannerWidth = 1920;
                const bannerHeight = 1080;

                bannerSharp.resize(bannerWidth, bannerHeight);

                if (label) {
                    const escapedLabelText = escapeXml(labelText);

                    const overlayFontAspectRatio = 0.55;
                    const overlayMaxFontSize = 116;

                    const overlayFontSize = (bannerWidth - 160) / overlayFontAspectRatio / Math.max(labelText.length + 2, Math.ceil((bannerWidth + 160) / overlayFontAspectRatio / overlayMaxFontSize));

                    const overlayHeight = overlayFontSize * 1.35;
                    const overlayWidth = Math.min(bannerWidth, 60 + overlayFontSize * overlayFontAspectRatio * (labelText.length + 2));

                    const overlay = Buffer.from(
                        `<svg width="${overlayWidth}" height="${overlayHeight}">
                        <rect x="0" y="0" width="100%" height="100%" style="fill: rgba(0, 0, 0, 50%)" />
                        <text x="50%" y="100%" dx="0.05em" dy="-0.30em" text-anchor="middle" font-family="Consolas" font-size="${overlayFontSize}" font-style="normal" font-weight="900" style="fill: black">#${escapedLabelText};</text>
                        <text x="50%" y="100%" dx="0.05em" dy="-0.35em" text-anchor="middle" font-family="Consolas" font-size="${overlayFontSize}" font-style="normal" font-weight="900"><tspan style="fill: #b676c7">#</tspan><tspan style="fill: #63b1dc">${escapedLabelText}</tspan><tspan style="fill: #afb2bc">;</tspan></text>
                    </svg>`,
                    );

                    bannerSharp.composite([{ input: overlay, top: Math.round(bannerHeight - 40.0 - overlayHeight), left: Math.round((bannerWidth - overlayWidth) * 0.5) }]);
                }

                const embed = new EmbedBuilder({
                    author: { name: 'Set Project Banner', iconURL: EmbedIcon.Success },
                    description: `${parseUser(interaction.user)} set the banner image of their project <#${project.channelId}> (${project.id}).`,
                    image: { url: 'attachment://banner.png' },
                    color: EmbedColor.Green,
                    footer: { text: 'Do not delete this message.' },
                });

                await interaction.editReply({ files: [new AttachmentBuilder(await bannerSharp.toBuffer(), { name: 'banner.png' })], embeds: [embed] });
            } catch (error) {
                console.error(error);
                replyError(interaction, 'Failed to process and save the banner image.');
                return;
            }

            await project.setBannerMessageID(bannerMessageID, interaction.user.id);
        } catch (error) {
            replyError(interaction, String(error));
        }
    },
};
