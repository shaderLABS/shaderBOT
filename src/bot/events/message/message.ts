import { Message, MessageEmbed, TextChannel } from 'discord.js';
import { db } from '../../../db/postgres.js';
import { commands, settings } from '../../bot.js';
import { GuildMessage, isGuildMessage, runCommand } from '../../commandHandler.js';
import { Event } from '../../eventHandler.js';
import { sendError } from '../../lib/embeds.js';
import { cacheAttachment } from '../../lib/ticketManagement.js';

export const event: Event = {
    name: 'message',
    callback: (message: Message) => {
        if (!isGuildMessage(message) || message.author.bot) return;

        const { content, channel } = message;
        if (channel.parentID && settings.ticket.categoryIDs.includes(channel.parentID)) return ticketComment(message);
        if (mediaOnly(message) || !content.startsWith(settings.prefix)) return;

        const args = parseContent(content);
        const invoke = args?.shift()?.toLowerCase();
        if (!invoke || !args) return;

        const command = commands.find((_value, key) => JSON.parse(key).includes(invoke));
        if (command) runCommand(command, message, invoke, args);
    },
};

function mediaOnly(message: GuildMessage) {
    if (!settings.mediaChannelIDs.includes(message.channel.id) || message.attachments.size !== 0 || message.member.permissions.has('MANAGE_MESSAGES')) return false;
    if (new RegExp('([a-zA-Z0-9]+://)?([a-zA-Z0-9_]+:[a-zA-Z0-9_]+@)?([a-zA-Z0-9.-]+\\.[A-Za-z]{2,4})(:[0-9]+)?(/.*)?').test(message.content)) return true;

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
                else prev.args[prev.args.length - 1] += curr.replace(/\\"/g, '"');
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
        .setColor(message.member.displayHexColor === '#000000' ? '#212121' : message.member.displayHexColor)
        .setAuthor(member.user.username + '#' + member.user.discriminator, member.user.displayAvatarURL() || undefined)
        .setTimestamp(timestamp)
        .setDescription(content);

    let attachment: string | undefined;
    try {
        const messageAttachment = await cacheAttachment(message);
        if (messageAttachment) {
            commentEmbed.attachFiles([messageAttachment.split('|')[0]]);
            attachment = messageAttachment;
        }
    } catch (error) {
        const errorMessage = await sendError(channel, error);
        setTimeout(() => errorMessage.delete(), 7500);
    }

    await message.delete();

    if (!attachment && (!content || content === '')) return;
    const commentMessage = await channel.send(commentEmbed);

    db.query(
        /*sql*/ `
        INSERT INTO comment (ticket_id, author_id, message_id, content, attachment, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, member.user.id, commentMessage.id, content, attachment, timestamp]
    );
}
