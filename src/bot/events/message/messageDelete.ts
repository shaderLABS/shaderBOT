import { Attachment, EmbedBuilder, Message } from 'discord.js';
import { settings } from '../../bot.js';
import { Event } from '../../eventHandler.js';
import { EmbedColor } from '../../lib/embeds.js';
import { getGuild, parseUser, trimString } from '../../lib/misc.js';
import { formatLongTimeDate } from '../../lib/time.js';

export const event: Event = {
    name: 'messageDelete',
    callback: async (message: Message) => {
        const { channel } = message;
        if ((!channel.isText() && !channel.isThread() && !channel.isVoice()) || (!message.partial && message.author.bot)) return;

        const logChannel = getGuild()?.channels.cache.get(settings.data.logging.messageChannelID);
        if (logChannel?.isText()) {
            const attachments: Attachment[] = [];
            const logEmbed = new EmbedBuilder({
                color: EmbedColor.red,
            });

            if (message.partial) {
                logEmbed
                    .setAuthor({ name: 'Deleted Message' })
                    .setDescription(`**Channel:** <#${message.channelId}>\n**Sent At:** ${formatLongTimeDate(new Date(message.createdTimestamp))}\n**Deleted At:** ${formatLongTimeDate(new Date())}`)
                    .setFooter({ text: `ID: ${message.id} | This is a partial message with very limited information.` });
            } else {
                let content = message.content + '\n\n';

                for (const attachment of message.attachments.values()) {
                    if (attachment.size > 8388608) content += attachment.url + '\n';
                    else attachments.push(new Attachment(attachment.url, attachment.name || undefined));
                }

                let metadata = `**Author:** ${parseUser(message.author)}\n**Channel:** <#${message.channelId}>\n**Sent At:** ${formatLongTimeDate(
                    new Date(message.createdTimestamp)
                )}\n**Deleted At:** ${formatLongTimeDate(new Date())}`;

                if (message.reference) {
                    metadata += `\n**Reference To:** [click here](https://discord.com/channels/${message.reference.guildId}/${message.reference.channelId}/${message.reference.messageId})`;
                }

                logEmbed
                    .setAuthor({
                        name: message.mentions.repliedUser
                            ? `Deleted Reply ${message.mentions.users.has(message.mentions.repliedUser.id) ? `(@${message.mentions.repliedUser.tag})` : ''}`
                            : 'Deleted Message',
                        iconURL: message.author.displayAvatarURL(),
                    })
                    .setDescription(trimString(`${metadata}\n\n${content.trim()}`, 4096))
                    .setFooter({ text: 'ID: ' + message.id });
            }

            logChannel.send({
                embeds: [logEmbed],
                files: attachments,
                allowedMentions: { parse: [] },
            });
        }
    },
};
