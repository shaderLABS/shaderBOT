import { Message, MessageEmbed, TextChannel } from 'discord.js';
import { db } from '../../../db/postgres.js';
import { commands, settings } from '../../bot.js';
import { GuildMessage, isGuildMessage, runCommand } from '../../commandHandler.js';
import { Event } from '../../eventHandler.js';
import { sendError } from '../../lib/embeds.js';
import { cacheAttachments } from '../../lib/ticketManagement.js';

export const event: Event = {
    name: 'message',
    callback: (message: Message) => {
        if (!isGuildMessage(message) || message.author.bot) return;

        const { content, channel } = message;
        if (channel.parentID && settings.ticket.categoryIDs.includes(channel.parentID)) return ticketComment(message);
        if (mediaOnly(message)) return;
        if (!content.startsWith(settings.prefix)) return;

        const parse = parseContent(content);
        if (!parse) return;
        const [invoke, ...args] = parse;

        const command = commands.find((_value, key) => JSON.parse(key).includes(invoke));
        if (command) runCommand(command, message, invoke, args);
    },
};

function mediaOnly(message: GuildMessage) {
    if (
        !settings.mediaChannelIDs.includes(message.channel.id) ||
        message.attachments.size !== 0 ||
        new RegExp('([a-zA-Z0-9]+://)?([a-zA-Z0-9_]+:[a-zA-Z0-9_]+@)?([a-zA-Z0-9.-]+\\.[A-Za-z]{2,4})(:[0-9]+)?(/.*)?').test(message.content) ||
        message.member.permissions.has('MANAGE_MESSAGES')
    )
        return false;

    message.delete();
    return true;
}

function parseContent(content: string) {
    return content
        .slice(settings.prefix.length)
        .trim()
        .match(/\\?.|^$/g)
        ?.reduce(
            (prev, curr) => {
                if (curr === '"') prev.quote ^= 1;
                else if (!prev.quote && curr === ' ') prev.args.push('');
                else prev.args[prev.args.length - 1] += curr.replace(/\\(.)/, '$1');
                return prev;
            },
            { args: [''], quote: 0 }
        ).args;
}

async function ticketComment(message: GuildMessage) {
    const { channel, member, content } = message;
    if (message.partial || !(channel instanceof TextChannel) || !member) return;

    const id = (await db.query(/*sql*/ `SELECT id FROM ticket WHERE channel_id = $1 LIMIT 1;`, [channel.id])).rows[0]?.id;
    if (!id) return;
    const timestamp = new Date();

    const commentEmbed = new MessageEmbed()
        .setColor(message.member?.displayHexColor || '#212121')
        .setAuthor(member.user.username + '#' + member.user.discriminator, member.user.displayAvatarURL() || undefined)
        .setTimestamp(timestamp)
        .setDescription(content);

    let attachments;
    try {
        const attachmentURLs = await cacheAttachments(message);
        if (attachmentURLs.length !== 0) {
            commentEmbed.attachFiles(attachmentURLs);
            attachments = attachmentURLs;
        }
    } catch (error) {
        const errorMessage = await sendError(channel, error);
        setTimeout(() => errorMessage.delete(), 7500);
    }

    await message.delete();

    if ((!attachments || attachments.length === 0) && (!content || content === '')) return;

    const commentMessage = await channel.send(commentEmbed);

    db.query(
        /*sql*/ `
        INSERT INTO comment (ticket_id, author_id, message_id, content, attachments, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, member.user.id, commentMessage.id, content, attachments, timestamp]
    );
}
