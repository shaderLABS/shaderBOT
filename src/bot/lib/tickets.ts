import { Message, TextChannel, Guild, MessageEmbed, GuildMember } from 'discord.js';
import { settings, client } from '../bot.js';
import { db } from '../../db/postgres.js';
import uuid from 'uuid-random';

export async function cacheAttachments(message: Message): Promise<string[]> {
    let fileUploadLimit = 8388119;
    if (message.guild?.premiumTier === 2) fileUploadLimit = 52428308;
    else if (message.guild?.premiumTier === 3) fileUploadLimit = 104856616;

    const attachmentURLs: string[] = [];

    if (message.attachments) {
        const attachmentStorage = message.guild?.channels.cache.get(settings.ticket.attachmentCacheChannelID);
        if (!attachmentStorage || !(attachmentStorage instanceof TextChannel)) return attachmentURLs;

        for (const attachment of message.attachments) {
            if (attachment[1].size > fileUploadLimit) return Promise.reject('The attachment is too large.');
            const storedAttachment = (await attachmentStorage.send(attachment)).attachments.first();
            if (storedAttachment) attachmentURLs.push(storedAttachment.url);
        }
    }

    return attachmentURLs;
}

export async function openTicket(args: string[], text: string, member: GuildMember): Promise<string> {
    const { guild } = member;

    const response = await db.query(
        /*sql*/ `
        SELECT ticket_id, title, project.project_id, project.channel_id AS project_channel_id, description, author_id, edited, attachments, timestamp 
            FROM ticket, project  
            WHERE ticket.project_id = project.project_id
                AND ${uuid.test(args[0]) ? 'ticket_id = $1' : 'title = $1'} 
                AND ($2::NUMERIC = ANY (owners) OR author_id = $2) 
                AND closed = TRUE 
            LIMIT 1`,
        [uuid.test(args[0]) ? args[0] : text, member.id]
    );

    if (response.rowCount === 0) {
        const similarResults = await db.query(
            /*sql*/ `
            SELECT ticket_id, title 
            FROM ticket, project
            WHERE ticket.project_id = project.project_id
                AND ($1::NUMERIC = ANY (project.owners) OR ticket.author_id = $1) 
                AND ticket.closed = TRUE
            ORDER BY SIMILARITY(title, $2) DESC
            LIMIT 3`,
            [member.id, text]
        );

        let errorMessage = 'No closed tickets were found.';
        if (similarResults.rowCount !== 0) errorMessage += '\nSimilar results:\n```' + similarResults.rows.map((row) => `${row.ticket_id} | ${row.title}`).join('\n') + '```';
        return Promise.reject(errorMessage);
    }

    const ticket = response.rows[0];

    const ticketChannel = await guild.channels.create(ticket.title, {
        type: 'text',
        parent: settings.ticket.categoryID,
        topic: `${ticket.ticket_id} | <#${ticket.project_channel_id}>`,
        rateLimitPerUser: 10,
        permissionOverwrites: [{ id: guild.roles.everyone, deny: 'SEND_MESSAGES' }],
    });

    const ticketAuthor = await client.users.fetch(ticket.author_id);

    let ticketFooter = `ID: ${ticket.ticket_id}`;
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
                value: `<#${ticket.project_channel_id}>`,
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
    if (!(subscriptionChannel instanceof TextChannel)) return Promise.reject('Invalid subscription channel.');

    const subscriptionMessage = await subscriptionChannel.send(ticketEmbed);

    await db.query(
        /*sql*/ `
        UPDATE ticket
        SET closed = FALSE, channel_id = $1, subscription_message_id = $2  
        WHERE ticket_id = $3;`,
        [ticketChannel.id, subscriptionMessage.id, ticket.ticket_id]
    );

    const comments = await db.query(
        /*sql*/ `
        SELECT comment_id, author_id, edited, timestamp, content, attachments
        FROM comment
        WHERE ticket_id = $1`,
        [ticket.ticket_id]
    );

    if (comments.rowCount !== 0) {
        let commentMessageQuery = '';

        for (let i = 0; i < comments.rowCount; i++) {
            const comment = comments.rows[i];
            const author = await member.guild.members.fetch(comment.author_id);

            const commentEmbed = new MessageEmbed()
                .setColor(author.displayHexColor || '#212121')
                .setAuthor(author.user.username + '#' + author.user.discriminator, author.user.avatarURL() || undefined)
                .setFooter(comment.edited ? `edited at ${new Date(comment.edited).toLocaleString()}` : '')
                .setTimestamp(new Date(comment.timestamp))
                .setDescription(comment.content);

            if (comment.attachments) commentEmbed.attachFiles(comment.attachments);
            const commentMessage = await ticketChannel.send(commentEmbed);
            commentMessageQuery += `UPDATE comment SET message_id = ${commentMessage.id} WHERE comment_id = '${comment.comment_id}';\n`;
        }

        await db.query(commentMessageQuery);
    }

    ticketChannel.overwritePermissions([]);
    return ticket.title;
}

export async function closeTicket(args: string[], text: string, member: GuildMember): Promise<string> {
    const response = await db.query(
        /*sql*/ `
        UPDATE ticket
        SET closed = TRUE 
        FROM project
        WHERE ticket.project_id = project.project_id
            AND ${uuid.test(args[0]) ? 'ticket.ticket_id = $1' : 'ticket.title = $1'} 
            AND ($2::NUMERIC = ANY (project.owners) OR ticket.author_id = $2) 
            AND ticket.closed = false
        RETURNING ticket.subscription_message_id, ticket.channel_id, ticket.title;`,
        [uuid.test(args[0]) ? args[0] : text, member.id]
    );

    if (response.rowCount === 0) {
        const similarResults = await db.query(
            /*sql*/ `
            SELECT ticket_id, title 
            FROM ticket, project
            WHERE ticket.project_id = project.project_id
                AND ($1::NUMERIC = ANY (project.owners) OR ticket.author_id = $1) 
                AND ticket.closed = FALSE
            ORDER BY SIMILARITY(title, $2) DESC
            LIMIT 3`,
            [member.id, text]
        );

        let errorMessage = 'No open tickets were found.';
        if (similarResults.rowCount !== 0) errorMessage += '\nSimilar results:\n```' + similarResults.rows.map((row) => `${row.ticket_id} | ${row.title}`).join('\n') + '```';
        return Promise.reject(errorMessage);
    }

    const ticket = response.rows[0];

    if (ticket.subscription_message_id) {
        const subscriptionChannel = member.guild.channels.cache.get(settings.ticket.subscriptionChannelID);
        if (!(subscriptionChannel instanceof TextChannel)) return Promise.reject('Invalid subscription channel.');
        (await subscriptionChannel.messages.fetch(ticket.subscription_message_id)).delete();
    }

    if (ticket.channel_id) {
        const ticketChannel = member.guild.channels.cache.get(ticket.channel_id);
        if (ticketChannel) ticketChannel.delete();
    }

    return ticket.title;
}
