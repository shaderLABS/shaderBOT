import { Message, MessageAttachment, MessageEmbed, TextChannel } from 'discord.js';
import { settings } from '../../bot.js';
import { Event } from '../../eventHandler.js';
import { embedColor } from '../../lib/embeds.js';
import { getGuild, isTextOrThreadChannel, parseUser } from '../../lib/misc.js';

export const event: Event = {
    name: 'messageDelete',
    callback: async (message: Message) => {
        const { channel } = message;
        if (!isTextOrThreadChannel(channel) || (!message.partial && message.author.bot)) return;

        const logChannel = getGuild()?.channels.cache.get(settings.logging.messageChannelID);
        if (logChannel instanceof TextChannel) {
            const logEmbed = new MessageEmbed({
                color: embedColor.red,
                timestamp: message.createdTimestamp,
            });

            if (message.partial) {
                logEmbed
                    .setAuthor('Deleted Message')
                    .setDescription(`**Channel:** <#${message.channelId}>\n**Message ID:** ${message.id}`)
                    .setFooter('This is a partial message with very limited information.');
            } else {
                logEmbed
                    .setAuthor('Deleted Message', message.author.displayAvatarURL())
                    .setDescription(`**Author:** ${parseUser(message.author)}\n**Channel:** <#${message.channelId}>\n**Message ID:** ${message.id}\n\n${message.content}`);
            }

            logChannel.send({
                embeds: [logEmbed],
                files: [...message.attachments.values()].map((attachment) => new MessageAttachment(attachment.url, attachment.name || undefined)),
                allowedMentions: { parse: [] },
            });
        }
    },
};
