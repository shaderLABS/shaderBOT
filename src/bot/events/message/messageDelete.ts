import { Attachment, ChannelType, EmbedBuilder, Message } from 'discord.js';
import { settings } from '../../bot.js';
import { Event } from '../../eventHandler.js';
import { EmbedColor } from '../../lib/embeds.js';
import { getGuild, getMaximumUploadBytes, parseUser, trimString } from '../../lib/misc.js';
import { formatLongTimeDate } from '../../lib/time.js';

export const event: Event = {
    name: 'messageDelete',
    callback: async (message: Message) => {
        const { channel } = message;
        if ((channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildVoice && !channel.isThread()) || (!message.partial && message.author.bot)) return;

        const logChannel = getGuild()?.channels.cache.get(settings.data.logging.messageChannelID);
        if (logChannel?.type === ChannelType.GuildText) {
            let attachments: Attachment[] = [];
            const logEmbed = new EmbedBuilder({
                color: EmbedColor.Red,
            });

            if (message.partial) {
                logEmbed
                    .setAuthor({ name: 'Deleted Message' })
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
                    new Date(message.createdTimestamp)
                )}\n**Deleted At:** ${formatLongTimeDate(new Date())}`;

                if (message.reference) {
                    metadata += `\n**Reference To:** [click here](https://discord.com/channels/${message.reference.guildId}/${message.reference.channelId}/${message.reference.messageId})`;
                }

                if (message.embeds.length > 0) {
                    metadata += `\n**Embeds:** ${message.embeds.length} (attached below)`;
                }

                logEmbed
                    .setAuthor({
                        name: message.mentions.repliedUser
                            ? `Deleted Reply ${message.mentions.users.has(message.mentions.repliedUser.id) ? `(@${message.mentions.repliedUser.tag})` : ''}`
                            : 'Deleted Message',
                        iconURL: message.author.displayAvatarURL(),
                    })
                    .setDescription(trimString(`${metadata}\n\n${content.trim()}`, 4096 - overflowAttachmentURLs.length) + overflowAttachmentURLs)
                    .setFooter({ text: 'ID: ' + message.id });
            }

            logChannel.send({
                embeds: [logEmbed, ...message.embeds].slice(0, 10),
                files: attachments,
                allowedMentions: { parse: [] },
            });
        }
    },
};
