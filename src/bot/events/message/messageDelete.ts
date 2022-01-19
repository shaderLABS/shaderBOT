import { Message, MessageAttachment, MessageEmbed, TextChannel } from 'discord.js';
import { settings } from '../../bot.js';
import { Event } from '../../eventHandler.js';
import { embedColor } from '../../lib/embeds.js';
import { getGuild, isTextOrThreadChannel, parseUser, trimString } from '../../lib/misc.js';

export const event: Event = {
    name: 'messageDelete',
    callback: async (message: Message) => {
        const { channel } = message;
        if (!isTextOrThreadChannel(channel) || (!message.partial && message.author.bot)) return;

        const logChannel = getGuild()?.channels.cache.get(settings.logging.messageChannelID);
        if (logChannel instanceof TextChannel) {
            const attachments: MessageAttachment[] = [];
            const logEmbed = new MessageEmbed({
                color: embedColor.red,
                timestamp: message.createdTimestamp,
            });

            if (message.partial) {
                logEmbed
                    .setAuthor({ name: 'Deleted Message' })
                    .setDescription(`**Channel:** <#${message.channelId}>\n**Message ID:** ${message.id}`)
                    .setFooter({ text: 'This is a partial message with very limited information.' });
            } else {
                let content = message.content + '\n\n';

                for (const attachment of message.attachments.values()) {
                    if (attachment.size > 8388608) content += attachment.url + '\n';
                    else attachments.push(new MessageAttachment(attachment.url, attachment.name || undefined));
                }

                logEmbed
                    .setAuthor({ name: 'Deleted Message', iconURL: message.author.displayAvatarURL() })
                    .setDescription(trimString(`**Author:** ${parseUser(message.author)}\n**Channel:** <#${message.channelId}>\n**Message ID:** ${message.id}\n\n${content.trim()}`, 4096));
            }

            logChannel.send({
                embeds: [logEmbed],
                files: attachments,
                allowedMentions: { parse: [] },
            });
        }
    },
};
