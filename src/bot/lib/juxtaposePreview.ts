import { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, ChannelType, ComponentType, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import sharp, { OverlayOptions } from 'sharp';
import { client, settings } from '../bot.js';
import { GuildMessage } from '../events/message/messageCreate.js';
import { EmbedColor, replyError } from './embeds.js';
import { escapeXml, parseUser } from './misc.js';

function createLabelBuffer(label: string, maxWidth: number) {
    const overlayFontAspectRatio = 0.55;
    const overlayFontSize = 18;
    const overlayPadding = 8;

    const overlayHeight = Math.floor(overlayFontSize * 1.35);
    const overlayWidth = Math.floor(Math.min(maxWidth, overlayPadding * 2 + overlayFontSize * overlayFontAspectRatio * label.length));

    return Buffer.from(
        `<svg width="${overlayWidth}" height="${overlayHeight}">
            <rect x="0" y="0" width="100%" height="100%" style="fill: rgba(0, 0, 0, 70%)" />
            <text x="${overlayPadding}" y="100%" dy="-0.35em" font-family="Consolas" font-size="${overlayFontSize}" font-style="normal" font-weight="900" style="fill: #ffffff">
                ${escapeXml(label)}
            </text>
        </svg>`
    );
}

export async function renderJuxtaposePreview(
    leftImageBuffer: Buffer,
    rightImageBuffer: Buffer,
    isVertical: boolean,
    leftImageLabel: string | undefined | null,
    rightImageLabel: string | undefined | null
) {
    const previewLeftSharp = sharp(leftImageBuffer);
    const previewRightSharp = sharp(rightImageBuffer);

    const [previewOriginalMetadata, previewRightOriginalMetadata] = await Promise.all([previewLeftSharp.metadata(), previewRightSharp.metadata()]);

    const previewOriginalWidth = previewOriginalMetadata.width || 0;
    const previewOriginalHeight = previewOriginalMetadata.height || 0;

    const previewRightOriginalWidth = previewRightOriginalMetadata.width || 0;
    const previewRightOriginalHeight = previewRightOriginalMetadata.height || 0;

    if (isVertical) {
        const previewWidth = 960;
        const previewHeight = Math.floor((previewOriginalHeight / previewOriginalWidth) * previewWidth);
        const previewRightHeight = Math.floor((previewRightOriginalHeight / previewRightOriginalWidth) * previewWidth);

        previewLeftSharp.resize(previewWidth, previewHeight, { fit: 'fill' }).flatten({ background: { r: 255, g: 255, b: 255 } });
        previewRightSharp.resize(previewWidth, previewRightHeight, { fit: 'fill' }).flatten({ background: { r: 255, g: 255, b: 255 } });

        const previewHalfHeight = Math.floor(previewHeight / 2);

        previewRightSharp
            .extract({ left: 0, width: previewWidth, top: previewRightHeight - previewHalfHeight, height: previewHalfHeight })
            .extend({ top: 3, background: { r: 255, g: 255, b: 255, alpha: 1 } });

        const labelOverlays: OverlayOptions[] = [];
        if (leftImageLabel) {
            labelOverlays.push({
                input: createLabelBuffer(leftImageLabel, previewWidth),
                gravity: sharp.gravity.northwest,
            });
        }
        if (rightImageLabel) {
            labelOverlays.push({
                input: createLabelBuffer(rightImageLabel, previewWidth),
                gravity: sharp.gravity.southwest,
            });
        }

        previewLeftSharp.composite([{ input: await previewRightSharp.toBuffer(), gravity: sharp.gravity.south }, ...labelOverlays]);
    } else {
        const previewHeight = 540;
        const previewWidth = Math.floor((previewOriginalWidth / previewOriginalHeight) * previewHeight);
        const previewRightWidth = Math.floor((previewRightOriginalWidth / previewRightOriginalHeight) * previewHeight);

        previewLeftSharp.resize(previewWidth, previewHeight, { fit: 'fill' }).flatten({ background: { r: 255, g: 255, b: 255 } });
        previewRightSharp.resize(previewRightWidth, previewHeight, { fit: 'fill' }).flatten({ background: { r: 255, g: 255, b: 255 } });

        const previewHalfWidth = Math.floor(previewWidth / 2);

        previewRightSharp
            .extract({ left: previewRightWidth - previewHalfWidth, width: previewHalfWidth, top: 0, height: previewHeight })
            .extend({ left: 3, background: { r: 255, g: 255, b: 255, alpha: 1 } });

        const labelOverlays: OverlayOptions[] = [];
        if (leftImageLabel) {
            labelOverlays.push({
                input: createLabelBuffer(leftImageLabel, previewHalfWidth),
                gravity: sharp.gravity.northwest,
            });
        }
        if (rightImageLabel) {
            labelOverlays.push({
                input: createLabelBuffer(rightImageLabel, previewHalfWidth),
                gravity: sharp.gravity.northeast,
            });
        }

        previewLeftSharp.composite([{ input: await previewRightSharp.toBuffer(), gravity: sharp.gravity.east }, ...labelOverlays]);
    }

    return await previewLeftSharp.toBuffer({ resolveWithObject: true });
}

const juxtaposeURLs = /https:\/\/cdn\.knightlab\.com\/libs\/juxtapose\/latest\/embed\/index\.html\?uid=([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/;

export async function checkJuxtaposePreview(message: GuildMessage) {
    const match = message.content.match(juxtaposeURLs);
    if (!match) return;

    const [juxtaposeURL, uuid] = match;

    try {
        const request = await fetch(`https://s3.amazonaws.com/uploads.knightlab.com/juxtapose/${uuid}.json`, {
            method: 'GET',
            headers: {
                DNT: '1',
                Accept: 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:104.0) Gecko/20100101 Firefox/104.0',
            },
        });

        const data = await request.json();

        const [leftImageRequest, rightImageRequest] = await Promise.all([fetch(data.images[0].src), fetch(data.images[1].src)]);
        const preview = await renderJuxtaposePreview(
            Buffer.from(await leftImageRequest.arrayBuffer()),
            Buffer.from(await rightImageRequest.arrayBuffer()),
            data.options.mode === 'vertical',
            data.images[0].label,
            data.images[1].label
        ).catch(() => undefined);

        const openButton = new ButtonBuilder({
            url: juxtaposeURL,
            style: ButtonStyle.Link,
            emoji: '🔗',
            label: 'Open',
        });

        const deleteButton = new ButtonBuilder({
            customId: 'deleteJuxtapose',
            style: ButtonStyle.Secondary,
            emoji: '🗑️',
        });

        const buttonActionRow = new ActionRowBuilder<ButtonBuilder>({ components: [openButton, deleteButton] });

        const reply = await message.reply({
            components: [buttonActionRow],
            files: [preview ? new AttachmentBuilder(preview.data, { name: 'preview.' + preview.info.format }) : data.images[0].src],
        });

        reply
            .awaitMessageComponent({
                componentType: ComponentType.Button,
                filter: (buttonInteraction) => {
                    if (buttonInteraction.user.id === message.author.id || buttonInteraction.member.permissions.has(PermissionFlagsBits.ManageMessages)) return true;

                    replyError(buttonInteraction, undefined, 'Insufficient Permissions');
                    return false;
                },
                time: 300_000, // 5min = 300,000ms
            })
            .then(() => {
                reply.delete().catch(() => undefined);
            })
            .catch(() => {
                deleteButton.setDisabled(true);
                reply.edit({ components: [buttonActionRow] }).catch(() => undefined);
            });

        const logChannel = client.channels.cache.get(settings.data.logging.messageChannelID);
        if (logChannel?.type === ChannelType.GuildText) {
            const previewURL = reply.attachments.first()?.url;
            logChannel.send({
                embeds: [
                    new EmbedBuilder({
                        color: EmbedColor.Blue,
                        author: {
                            name: 'Juxtapose',
                            iconURL: message.author.displayAvatarURL(),
                            url: message.url,
                        },
                        description: `${parseUser(message.author)} sent a [juxtapose URL](${juxtaposeURL}) in [their message](${message.url}) (${message.id}). A [preview](${
                            reply.url
                        }) has been rendered.`,
                        image: previewURL ? { url: previewURL } : undefined,
                        footer: {
                            text: `ID: ${message.id}`,
                        },
                    }),
                ],
            });
        }
    } catch (error) {
        console.error(error);
        return;
    }
}
