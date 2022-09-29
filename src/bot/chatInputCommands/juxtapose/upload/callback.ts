import { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, ChannelType, ComponentType, DataResolver, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { settings } from '../../../bot.js';
import { ChatInputCommandCallback } from '../../../chatInputCommandHandler.js';
import { EmbedColor, replyError } from '../../../lib/embeds.js';
import { renderJuxtaposePreview } from '../../../lib/juxtaposePreview.js';
import { getGuild, parseUser } from '../../../lib/misc.js';

export const command: ChatInputCommandCallback = {
    callback: async (interaction) => {
        const leftImageAttachment = interaction.options.getAttachment('left_image', true);
        const rightImageAttachment = interaction.options.getAttachment('right_image', true);

        const leftLabel = interaction.options.getString('left_label', false);
        const rightLabel = interaction.options.getString('right_label', false);

        const isVertical = interaction.options.getBoolean('vertical', false) || false;

        try {
            if (
                !['image/jpeg', 'image/png', 'image/webp'].includes(leftImageAttachment.contentType || '') ||
                !['image/jpeg', 'image/png', 'image/webp'].includes(rightImageAttachment.contentType || '')
            ) {
                return replyError(interaction, 'Unsupported file type. You must upload PNG, JPEG or WebP images.');
            }

            var previewPromise = renderJuxtaposePreview(
                (await DataResolver.resolveFile(leftImageAttachment.attachment)).data,
                (await DataResolver.resolveFile(rightImageAttachment.attachment)).data,
                isVertical,
                leftLabel,
                rightLabel
            );
        } catch {
            return replyError(interaction, 'Failed to resolve the images. You must provide URLs to PNG, JPEG or WebP images');
        }

        await interaction.deferReply();

        const response = await fetch('https://juxtapose.knightlab.com/juxtapose/create/', {
            method: 'POST',
            headers: {
                DNT: '1',
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:104.0) Gecko/20100101 Firefox/104.0',
            },
            body: JSON.stringify({
                images: [
                    { src: leftImageAttachment.url, label: leftLabel, credit: '' },
                    { src: rightImageAttachment.url, label: rightLabel, credit: '' },
                ],
                options: { animate: true, showLabels: true, showCredits: false, makeResponsive: true, mode: isVertical ? 'vertical' : 'horizontal', startingPosition: '50' },
            }),
        });

        if (response.status !== 200) throw 'The API request failed with code ' + response.status + '.';
        const data = await response.json();

        if (data.error) return replyError(interaction, data.error);

        const juxtaposeURL = 'https://cdn.knightlab.com/libs/juxtapose/latest/embed/index.html?uid=' + data.uid;
        const preview = await previewPromise.catch(() => undefined);

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

        const reply = await interaction.editReply({
            components: [buttonActionRow],
            files: [preview ? new AttachmentBuilder(preview.data, { name: 'preview.' + preview.info.format }) : leftImageAttachment],
        });

        reply
            .awaitMessageComponent({
                componentType: ComponentType.Button,
                filter: (buttonInteraction) => {
                    if (buttonInteraction.user.id === interaction.user.id || buttonInteraction.member.permissions.has(PermissionFlagsBits.ManageMessages)) return true;

                    replyError(buttonInteraction, undefined, 'Insufficient Permissions');
                    return false;
                },
                time: 300_000, // 5min = 300,000ms
            })
            .then(() => {
                reply.delete();
            })
            .catch(() => {
                deleteButton.setDisabled(true);
                reply.edit({ components: [buttonActionRow] });
            });

        const logChannel = getGuild()?.channels.cache.get(settings.data.logging.messageChannelID);
        if (logChannel?.type === ChannelType.GuildText) {
            logChannel.send({
                embeds: [
                    new EmbedBuilder({
                        color: EmbedColor.Blue,
                        author: {
                            name: 'Juxtapose',
                            iconURL: interaction.user.displayAvatarURL(),
                            url: reply.url,
                        },
                        description: `${parseUser(interaction.user)} created a [juxtapose](${reply.url}) by uploading two files.`,
                        footer: {
                            text: `ID: ${reply.id}`,
                        },
                    }),
                ],
            });
        }
    },
};
