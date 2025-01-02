import { Attachment, ChannelType, EmbedBuilder, Events, Message, type PartialMessage } from 'discord.js';
import { client, settings } from '../../bot.ts';
import type { Event } from '../../eventHandler.ts';
import { EmbedColor } from '../../lib/embeds.ts';
import { getMaximumUploadBytes, parseUser, trimString } from '../../lib/misc.ts';
import { formatLongTimeDate } from '../../lib/time.ts';

export const event: Event = {
    name: Events.MessageDelete,
    callback: (message) => {
        const { channel } = message;
        if (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildVoice && !channel.isThread()) return;
        if (message.partial || !message.author.bot) logDeletedMessage(message);
    },
};

async function logDeletedMessage(message: Message | PartialMessage) {
    let attachments: Attachment[] = [];
    const logEmbed = new EmbedBuilder({
        color: EmbedColor.Red,
    });

    if (message.partial) {
        logEmbed
            .setAuthor({ name: 'Delete Message' })
            .setDescription(`**Channel:** <#${message.channelId}>\n**Sent At:** ${formatLongTimeDate(new Date(message.createdTimestamp))}\n**Deleted At:** ${formatLongTimeDate(new Date())}`)
            .setFooter({ text: `ID: ${message.id} | This is a partial message with very limited information.` });
    } else {
        let content = message.content + '\n\n';

        attachments.push(...message.attachments.values());

        let totalAttachmentSize = 0;
        let overflowAttachmentURLs = '';
        const maxAttachmentSize = getMaximumUploadBytes(message.guild);

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

        let metadata = `**Author:** ${parseUser(message.author)}\n**Channel:** <#${message.channelId}>\n**Sent At:** ${formatLongTimeDate(
            new Date(message.createdTimestamp),
        )}\n**Deleted At:** ${formatLongTimeDate(new Date())}`;

        if (message.reference) {
            metadata += `\n**Reference To:** https://discord.com/channels/${message.reference.guildId}/${message.reference.channelId}`;
            if (message.reference.messageId) metadata += `/${message.reference.messageId}`;
        }

        if (message.embeds.length > 0) {
            metadata += `\n**Embeds:** ${message.embeds.length} (attached below)`;
        }

        logEmbed
            .setAuthor({
                name: message.mentions.repliedUser
                    ? `Delete Reply ${message.mentions.users.has(message.mentions.repliedUser.id) ? `(@${message.mentions.repliedUser.username})` : ''}`
                    : 'Delete Message',
                iconURL: message.author.displayAvatarURL(),
            })
            .setDescription(trimString(`${metadata}\n\n${content.trim()}`, 4096 - overflowAttachmentURLs.length) + overflowAttachmentURLs)
            .setFooter({ text: 'ID: ' + message.id });
    }

    const logChannel = client.channels.cache.get(settings.data.logging.messageChannelID);
    if (logChannel?.type !== ChannelType.GuildText) return;

    logChannel.send({
        embeds: [logEmbed, ...message.embeds].slice(0, 10),
        files: attachments,
        allowedMentions: { parse: [] },
    });
}
