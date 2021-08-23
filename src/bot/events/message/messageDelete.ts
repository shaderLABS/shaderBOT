import { Message, MessageAttachment, MessageEmbed, TextChannel } from 'discord.js';
import { db } from '../../../db/postgres.js';
import { settings } from '../../bot.js';
import { Event } from '../../eventHandler.js';
import { embedColor } from '../../lib/embeds.js';
import log from '../../lib/log.js';
import { getGuild, isTextOrThreadChannel, parseUser } from '../../lib/misc.js';
import { deleteAttachmentFromDiscord } from '../../lib/ticketManagement.js';

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

        if (!(channel instanceof TextChannel) || !channel.parentId || !settings.ticket.categoryIDs.includes(channel.parentId) || (!message.partial && message.embeds.length === 0)) return;

        const comment = (
            await db.query(
                /*sql*/ `
                DELETE FROM comment
                USING ticket
                WHERE ticket.id = comment.ticket_id AND ticket.channel_id = $1 AND comment.message_id = $2
                RETURNING comment.content, comment.author_id, comment.attachment`,
                [channel.id, message.id]
            )
        ).rows[0];

        if (!comment) return;

        const guild = getGuild();
        if (comment.attachment && guild) deleteAttachmentFromDiscord(comment.attachment, guild);
        log(`${parseUser(comment.author_id)}'s ticket comment has been deleted from <#${channel.id}>:\n\n${comment.content}`, 'Delete Ticket Comment');
    },
};
