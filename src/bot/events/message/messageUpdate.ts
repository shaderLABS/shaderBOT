import { Attachment, ChannelType, Embed, EmbedBuilder, Events, MessageFlags } from 'discord.js';
import { client, settings } from '../../bot.ts';
import type { Event } from '../../eventHandler.ts';
import { EmbedColor } from '../../lib/embeds.ts';
import { getMaximumUploadBytes, getNumberWithOrdinalSuffix, parseUser, trimString } from '../../lib/misc.ts';
import { formatLongTimeDate } from '../../lib/time.ts';

export const event: Event = {
    name: Events.MessageUpdate,
    callback: async (oldMessage, newMessage) => {
        const { channel } = newMessage;

        if (newMessage.partial) {
            newMessage = (await newMessage.fetch().catch(() => undefined)) ?? newMessage;
        }

        if (
            // message is neither in text/voice nor thread channel
            (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildVoice && !channel.isThread()) ||
            // message is sent by bot
            newMessage.author?.bot ||
            // embeds were added due to links being resolved
            (!oldMessage.partial && oldMessage.embeds.length === 0 && newMessage.embeds.length > 0 && newMessage.editedTimestamp === null)
        ) {
            return;
        }

        const embeds: Embed[] = [];
        let attachments: Attachment[] = [];

        const metadata = `**Author:** ${newMessage.author ? parseUser(newMessage.author) : 'Unknown'}\n**Channel:** <#${newMessage.channelId}>\n**Sent At:** ${formatLongTimeDate(
            newMessage.createdAt
        )}\n**Edited At:** ${formatLongTimeDate(new Date())}`;

        let content = '';
        if (oldMessage.partial || newMessage.partial) {
            content += `\n\nThe message is a partial with limited information. All embeds are attached below, and all attachments are attached above this message.\n\n**New Flags**\n${
                newMessage.flags.toArray().join(', ') || 'none'
            }`;

            if (!newMessage.partial) {
                content += `\n\n**New Content**\n${newMessage.content.trim()}`;
            }

            attachments.push(...newMessage.attachments.values());
            embeds.push(...newMessage.embeds);
        } else if (!oldMessage.flags.has(MessageFlags.SuppressEmbeds) && newMessage.flags.has(MessageFlags.SuppressEmbeds)) {
            content += '\n\nThe message embeds have been suppressed. The suppressed embeds are attached below.';
            embeds.push(...oldMessage.embeds);
        } else if (!oldMessage.hasThread && newMessage.hasThread) {
            content += '\n\nA thread attached to this message has been created.';
        } else if (oldMessage.hasThread && !newMessage.hasThread) {
            content += '\n\nThe thread attached to this message has been deleted.';
        } else if (!oldMessage.pinned && newMessage.pinned) {
            content += '\n\nThis message has been pinned.';
        } else if (oldMessage.pinned && !newMessage.pinned) {
            content += '\n\nThis message has been unpinned.';
        } else {
            if (oldMessage.attachments.size !== 0 || newMessage.attachments.size !== 0) {
                const removedAttachments = oldMessage.attachments.filter((_, attachmentID) => !newMessage.attachments.has(attachmentID));
                if (removedAttachments.size !== 0) {
                    if (removedAttachments.size > 1) {
                        content += `\n\n${removedAttachments.size} attachments have been removed. The removed attachments are attached above as the ${
                            getNumberWithOrdinalSuffix(attachments.length + 1) + ' - ' + getNumberWithOrdinalSuffix(attachments.length + removedAttachments.size)
                        } files.`;
                    } else {
                        content += `\n\nOne attachment has been removed. The removed attachment is attached above as the ${getNumberWithOrdinalSuffix(attachments.length + 1)} file.`;
                    }

                    attachments.push(...removedAttachments.values());
                }

                const addedAttachments = newMessage.attachments.filter((_, attachmentID) => !oldMessage.attachments.has(attachmentID));
                if (addedAttachments.size !== 0) {
                    if (addedAttachments.size > 1) {
                        content += `\n\n${addedAttachments.size} attachments have been added. The added attachments are attached above as the ${
                            getNumberWithOrdinalSuffix(attachments.length + 1) + ' - ' + getNumberWithOrdinalSuffix(attachments.length + addedAttachments.size)
                        } files.`;
                    } else {
                        content += `\n\nOne attachment has been added. The added attachment is attached above as the ${getNumberWithOrdinalSuffix(attachments.length + 1)} file.`;
                    }

                    attachments.push(...addedAttachments.values());
                }
            }

            if (oldMessage.embeds.length !== 0 || newMessage.embeds.length !== 0) {
                const removedEmbeds = oldMessage.embeds.filter((oldEmbed) => !newMessage.embeds.some((newEmbed) => oldEmbed.equals(newEmbed)));
                if (removedEmbeds.length !== 0) {
                    if (removedEmbeds.length > 1) {
                        content += `\n\n${removedEmbeds.length} embeds have been removed. The removed embeds are attached below as the ${
                            getNumberWithOrdinalSuffix(embeds.length + 1) + ' - ' + getNumberWithOrdinalSuffix(embeds.length + removedEmbeds.length)
                        } embeds.`;
                    } else {
                        content += `\n\nOne embed has been removed. The removed embed is attached below as the ${getNumberWithOrdinalSuffix(embeds.length + 1)} embed.`;
                    }

                    embeds.push(...removedEmbeds.values());
                }

                const addedEmbeds = newMessage.embeds.filter((newEmbed) => !oldMessage.embeds.some((oldEmbed) => newEmbed.equals(oldEmbed)));
                if (addedEmbeds.length !== 0) {
                    if (addedEmbeds.length > 1) {
                        content += `\n\n${addedEmbeds.length} embeds have been added. The added embeds are attached below as the ${
                            getNumberWithOrdinalSuffix(embeds.length + 1) + ' - ' + getNumberWithOrdinalSuffix(embeds.length + addedEmbeds.length)
                        } embeds.`;
                    } else {
                        content += `\n\nOne embed has been added. The added embed is attached below as the ${getNumberWithOrdinalSuffix(embeds.length + 1)} embed.`;
                    }

                    embeds.push(...addedEmbeds.values());
                }
            }

            if (oldMessage.content !== newMessage.content) {
                content += '\n\n**Old Content**\n' + oldMessage.content.trim() + '\n\n**New Content**\n' + newMessage.content.trim();
            }
        }

        if (!content) return;

        let totalAttachmentSize = 0;
        let overflowAttachmentURLs = '';
        const maxAttachmentSize = getMaximumUploadBytes(newMessage.guild);

        attachments = attachments.filter((attachment) => {
            totalAttachmentSize += attachment.size;
            if (totalAttachmentSize > maxAttachmentSize) {
                overflowAttachmentURLs += '\n' + attachment.url;
                return false;
            } else {
                return true;
            }
        });

        if (overflowAttachmentURLs) overflowAttachmentURLs = '\n\n**Overflow Attachments**' + overflowAttachmentURLs;

        const logEmbed = new EmbedBuilder({
            color: EmbedColor.Blue,
            author: {
                name: newMessage.mentions.repliedUser
                    ? `Edit Reply ${newMessage.mentions.users.has(newMessage.mentions.repliedUser.id) ? `(@${newMessage.mentions.repliedUser.username})` : ''}`
                    : 'Edit Message',
                iconURL: newMessage.author?.displayAvatarURL(),
                url: newMessage.url,
            },
            description: trimString(metadata + content, 4096 - overflowAttachmentURLs.length) + overflowAttachmentURLs,
            footer: {
                text: `ID: ${newMessage.id}`,
            },
        });

        const logChannel = client.channels.cache.get(settings.data.logging.messageChannelID);
        if (logChannel?.type !== ChannelType.GuildText) return;

        logChannel.send({
            embeds: [logEmbed, ...embeds].slice(0, 10),
            files: attachments,
            allowedMentions: { parse: [] },
        });
    },
};
