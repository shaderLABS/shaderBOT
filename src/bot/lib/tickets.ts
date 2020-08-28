import { Message, TextChannel, Guild, MessageEmbed } from 'discord.js';
import { settings, client } from '../bot';
import { ExtractDoc } from 'ts-mongoose';
import { TicketSchema } from '../../db/models/Ticket.js';

export async function cacheAttachments(message: Message): Promise<string[]> {
    const attachmentURLs: string[] = [];

    if (message.attachments) {
        const attachmentStorage = message.guild?.channels.cache.get(settings.ticket.attachmentCacheChannelID);
        if (!attachmentStorage || !(attachmentStorage instanceof TextChannel)) return attachmentURLs;

        for (const attachment of message.attachments) {
            const storedAttachment = (await attachmentStorage.send(attachment)).attachments.first();
            if (storedAttachment) attachmentURLs.push(storedAttachment.url);
        }
    }

    return attachmentURLs;
}

export async function openTicket(ticket: ExtractDoc<typeof TicketSchema>, guild: Guild) {
    ticket.closed = false;

    const ticketChannel = await guild.channels.create(ticket.title, {
        type: 'text',
        parent: settings.ticket.categoryID,
        topic: `${ticket._id} | <#${ticket.project}>`,
        rateLimitPerUser: 10,
        permissionOverwrites: [{ id: guild.roles.everyone, deny: 'SEND_MESSAGES' }],
    });
    ticket.channel = ticketChannel.id;

    const ticketAuthor = await client.users.fetch(ticket.author);

    let ticketFooter = `ID: ${ticket._id}`;
    if (ticket.edited) ticketFooter += ` | edited at ${new Date(ticket.edited).toLocaleString()}`;

    const ticketEmbed = new MessageEmbed()
        .setAuthor(ticketAuthor.username + '#' + ticketAuthor.discriminator, ticketAuthor.avatarURL() || undefined)
        .setColor('#006fff')
        .setFooter(ticketFooter)
        .addFields([
            {
                name: 'Title',
                value: ticket.title,
            },
            {
                name: 'Project',
                value: `<#${ticket.project}>`,
            },
            {
                name: 'Description',
                value: ticket.description,
            },
        ])
        .setTimestamp(new Date(ticket.timestamp));

    if (ticket.attachments) ticketEmbed.attachFiles(ticket.attachments);

    await ticketChannel.send(ticketEmbed);

    const subscriptionChannel = guild.channels.cache.get(settings.ticket.subscriptionChannelID);
    if (!(subscriptionChannel instanceof TextChannel)) return;

    const subscriptionMessage = await subscriptionChannel.send(ticketEmbed);
    ticket.subscriptionMessage = subscriptionMessage.id;

    if (ticket.comments) {
        await Promise.all(
            ticket.comments.map(async (comment) => {
                const member = await guild.members.fetch(comment.author);

                const commentEmbed = new MessageEmbed()
                    .setColor(member.displayHexColor || '#212121')
                    .setAuthor(member.user.username + '#' + member.user.discriminator, member.user.avatarURL() || undefined)
                    .setFooter(comment.edited ? `edited at ${new Date(comment.edited).toLocaleString()}` : '')
                    .setTimestamp(new Date(comment.timestamp))
                    .setDescription(comment.content);

                if (comment.attachments) commentEmbed.attachFiles(comment.attachments);

                const commentMessage = await ticketChannel.send(commentEmbed);

                comment.message = commentMessage.id;
                return comment;
            })
        );
    }

    await ticket.save();
    ticketChannel.overwritePermissions([]);
}

export async function closeTicket(ticket: ExtractDoc<typeof TicketSchema>, guild: Guild) {
    ticket.closed = true;

    if (ticket.subscriptionMessage) {
        const subscriptionChannel = guild.channels.cache.get(settings.ticket.subscriptionChannelID);
        if (!(subscriptionChannel instanceof TextChannel)) return;

        (await subscriptionChannel.messages.fetch(ticket.subscriptionMessage)).delete();
        ticket.subscriptionMessage = '';
    }

    if (ticket.channel) {
        (await client.channels.fetch(ticket.channel)).delete();
        ticket.channel = undefined;
    }

    await ticket.save();
}
