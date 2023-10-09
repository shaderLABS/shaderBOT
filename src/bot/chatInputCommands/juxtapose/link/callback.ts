import { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, ChannelType, ComponentType, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { client, settings } from '../../../bot.js';
import { ChatInputCommandCallback } from '../../../chatInputCommandHandler.js';
import { EmbedColor, replyError } from '../../../lib/embeds.js';
import { createJuxtaposeFromURLs } from '../../../lib/juxtapose.js';
import { renderJuxtaposePreview } from '../../../lib/juxtaposePreview.js';
import { isValidUrl, parseUser } from '../../../lib/misc.js';

export const command: ChatInputCommandCallback = {
    callback: async (interaction) => {
        const leftImageURL = interaction.options.getString('left_image', true);
        const rightImageURL = interaction.options.getString('right_image', true);

        const leftLabel = interaction.options.getString('left_label', false);
        const rightLabel = interaction.options.getString('right_label', false);

        const isVertical = interaction.options.getBoolean('vertical', false) || false;

        if (!isValidUrl(leftImageURL) || !isValidUrl(rightImageURL)) {
            replyError(interaction, 'The specified image links are not valid URLs.');
            return;
        }

        const fetchAbortController = new AbortController();

        try {
            const [leftImageResponse, rightImageResponse] = await Promise.all([
                fetch(leftImageURL, { signal: fetchAbortController.signal }),
                fetch(rightImageURL, { signal: fetchAbortController.signal }),
            ]);

            if (
                !['image/jpeg', 'image/png', 'image/webp'].includes(leftImageResponse.headers.get('Content-Type') || '') ||
                !['image/jpeg', 'image/png', 'image/webp'].includes(rightImageResponse.headers.get('Content-Type') || '')
            ) {
                fetchAbortController.abort();
                replyError(interaction, 'Unsupported file type. You must provide URLs to PNG, JPEG or WebP images.');
                return;
            }

            await interaction.deferReply();

            var previewPromise = renderJuxtaposePreview(await leftImageResponse.arrayBuffer(), await rightImageResponse.arrayBuffer(), isVertical, leftLabel, rightLabel);
        } catch {
            fetchAbortController.abort();
            replyError(interaction, 'Failed to resolve the images.');
            return;
        }

        const preview = await previewPromise.catch(() => undefined);

        const reply = await interaction.editReply({
            files: preview ? [new AttachmentBuilder(preview.data, { name: 'preview.' + preview.info.format }), leftImageURL, rightImageURL] : [leftImageURL, rightImageURL],
        });

        const juxtaposeID = await createJuxtaposeFromURLs(reply, leftImageURL, rightImageURL, leftLabel, rightLabel, isVertical);
        const juxtaposeURL = 'https://cdn.knightlab.com/libs/juxtapose/latest/embed/index.html?uid=' + juxtaposeID;

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

        await interaction.editReply({
            components: [new ActionRowBuilder<ButtonBuilder>({ components: [openButton, deleteButton] })],
        });

        reply
            .awaitMessageComponent({
                componentType: ComponentType.Button,
                filter: (buttonInteraction) => {
                    if (buttonInteraction.customId !== 'deleteJuxtapose') return false;
                    if (buttonInteraction.user.id === interaction.user.id || buttonInteraction.member.permissions.has(PermissionFlagsBits.ManageMessages)) return true;

                    replyError(buttonInteraction, undefined, 'Insufficient Permissions');
                    return false;
                },
                time: 300_000, // 5min = 300,000ms
            })
            .then(async (buttonInteraction) => {
                try {
                    await buttonInteraction.deferUpdate();
                    await buttonInteraction.deleteReply();
                } catch {}
            })
            .catch(() => {
                reply.edit({ components: [new ActionRowBuilder<ButtonBuilder>({ components: [openButton] })] }).catch(() => undefined);
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
                            iconURL: interaction.user.displayAvatarURL(),
                            url: reply.url,
                        },
                        description: `${parseUser(interaction.user)} created a [juxtapose](${juxtaposeURL}) by specifying two URLs. A [preview](${reply.url}) has been rendered.`,
                        image: previewURL ? { url: previewURL } : undefined,
                        footer: {
                            text: `ID: ${reply.id}`,
                        },
                    }),
                ],
            });
        }
    },
};
