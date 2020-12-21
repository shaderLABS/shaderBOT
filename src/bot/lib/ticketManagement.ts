import { CategoryChannel, Guild, GuildMember, Message, MessageEmbed, TextChannel, User } from 'discord.js';
import uuid from 'uuid-random';
import { db } from '../../db/postgres.js';
import { client, settings } from '../bot.js';
import { update } from '../settings/settings.js';
import { formatTimeDate, getGuild } from './misc.js';

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

export async function openTicket(args: string[], text: string, member: GuildMember, moderate: boolean = false) {
    const { guild } = member;

    const response = await db.query(
        /*sql*/ `
        SELECT ticket.id, title, project_channel_id, description, author_id, edited, attachments, timestamp 
            FROM ticket 
            ${moderate ? '' : 'LEFT JOIN project ON ticket.project_channel_id = project.channel_id'}
            WHERE ${uuid.test(args[0]) ? 'ticket.id = $1' : 'title = $1'} 
                ${moderate ? '' : 'AND ($2::NUMERIC = ANY (project.owners) OR ticket.author_id = $2)'} 
                AND closed = TRUE 
            LIMIT 1`,
        moderate ? [uuid.test(args[0]) ? args[0] : text] : [uuid.test(args[0]) ? args[0] : text, member.id]
    );

    if (response.rowCount === 0) {
        const similarResults = await db.query(
            /*sql*/ `
            SELECT ticket.id, title 
            FROM ${moderate ? 'ticket' : 'ticket LEFT JOIN project ON ticket.project_channel_id = project.channel_id'}
            WHERE ticket.closed = TRUE
                ${moderate ? '' : 'AND ($2::NUMERIC = ANY (project.owners) OR ticket.author_id = $2)'} 
            ORDER BY SIMILARITY(title, $1) DESC
            LIMIT 3`,
            moderate ? [text] : [text, member.id]
        );

        let errorMessage = 'No closed tickets were found.';
        if (similarResults.rowCount !== 0) errorMessage += '\nSimilar results:\n```' + similarResults.rows.map((row: any) => `${row.id} | ${row.title}`).join('\n') + '```';
        return Promise.reject(errorMessage);
    }

    const ticket = await openTicketLib(response.rows[0], guild);
    return { title: ticket.title, author: ticket.author_id };
}

export async function openTicketLib(ticket: any, guild: Guild | undefined = getGuild()) {
    if (!guild) return Promise.reject('No guild.');

    const ticketChannel = await guild.channels.create(ticket.title, {
        type: 'text',
        parent: await getCategoryChannel(settings.ticket.categoryIDs, guild),
        topic: `${ticket.id} | ${ticket.project_channel_id ? '<#' + ticket.project_channel_id + '>' : 'DELETED PROJECT'} | ${cutDescription(ticket.description)}`,
        rateLimitPerUser: 10,
        permissionOverwrites: [{ id: guild.roles.everyone, deny: 'SEND_MESSAGES' }],
    });

    const ticketAuthor = await client.users.fetch(ticket.author_id);

    let ticketFooter = `ID: ${ticket.id}`;
    if (ticket.edited) ticketFooter += ` | edited at ${formatTimeDate(new Date(ticket.edited))}`;

    const ticketEmbed = new MessageEmbed()
        .setAuthor(ticketAuthor.username + '#' + ticketAuthor.discriminator, ticketAuthor.displayAvatarURL() || undefined)
        .setColor('#006fff')
        .setFooter(ticketFooter)
        .addFields([
            {
                name: 'Title',
                value: ticket.title,
            },
            {
                name: 'Project',
                value: ticket.project_channel_id ? '<#' + ticket.project_channel_id + '>' : 'DELETED PROJECT',
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
        WHERE id = $3;`,
        [ticketChannel.id, subscriptionMessage.id, ticket.id]
    );

    const comments = await db.query(
        /*sql*/ `
        SELECT id, author_id, edited, timestamp, content, attachments
        FROM comment
        WHERE ticket_id = $1
        ORDER BY timestamp ASC`,
        [ticket.id]
    );

    if (comments.rowCount !== 0) {
        let commentMessageQuery = '';

        for (let i = 0; i < comments.rowCount; i++) {
            const comment = comments.rows[i];
            const author = (await guild.members.fetch(comment.author_id).catch(() => undefined)) || {
                displayHexColor: '#707070',
                user: await client.users.fetch(comment.author_id),
            };

            const commentEmbed = new MessageEmbed()
                .setColor(author?.displayHexColor || '#212121')
                .setAuthor(author?.user.username + '#' + author?.user.discriminator, author?.user.displayAvatarURL() || undefined)
                .setFooter(comment.edited ? `edited at ${formatTimeDate(new Date(comment.edited))}` : '')
                .setTimestamp(new Date(comment.timestamp))
                .setDescription(comment.content);

            if (comment.attachments) commentEmbed.attachFiles(comment.attachments);
            const commentMessage = await ticketChannel.send(commentEmbed);
            commentMessageQuery += /*sql*/ `UPDATE comment SET message_id = ${commentMessage.id} WHERE id = '${comment.id}';\n`;
        }

        await db.query(commentMessageQuery);
    }

    ticketChannel.overwritePermissions([]);

    ticket.closed = false;
    return ticket;
}

export async function closeTicket(args: string[], text: string, member: GuildMember, moderate: boolean = false) {
    const response = await db.query(
        /*sql*/ `
        UPDATE ticket
        SET closed = TRUE 
        ${moderate ? '' : 'FROM ticket t LEFT JOIN project ON t.project_channel_id = project.channel_id'}
        WHERE ${uuid.test(args[0]) ? 'ticket.id = $1' : 'ticket.title = $1'} 
            AND ticket.closed = FALSE
            ${moderate ? '' : 'AND ($2::NUMERIC = ANY (project.owners) OR ticket.author_id = $2)'} 
        RETURNING ticket.subscription_message_id, ticket.channel_id, ticket.title, ticket.author_id;`,
        moderate ? [uuid.test(args[0]) ? args[0] : text] : [uuid.test(args[0]) ? args[0] : text, member.id]
    );

    if (response.rowCount === 0) {
        const similarResults = await db.query(
            /*sql*/ `
            SELECT ticket.id, title 
            FROM ${moderate ? 'ticket' : 'ticket LEFT JOIN project ON ticket.project_channel_id = project.channel_id'}
            WHERE ticket.closed = FALSE
                ${moderate ? '' : 'AND ($2::NUMERIC = ANY (project.owners) OR ticket.author_id = $2)'} 
            ORDER BY SIMILARITY(title, $1) DESC
            LIMIT 3`,
            moderate ? [text] : [text, member.id]
        );

        let errorMessage = 'No open tickets were found.';
        if (similarResults.rowCount !== 0) errorMessage += '\nSimilar results:\n```' + similarResults.rows.map((row: any) => `${row.id} | ${row.title}`).join('\n') + '```';
        return Promise.reject(errorMessage);
    }

    const ticket = response.rows[0];
    await closeTicketLib(ticket, member.guild);

    return { title: ticket.title, author: ticket.author_id };
}

export async function closeTicketLib(ticket: any, guild: Guild | undefined = getGuild()) {
    if (!guild) return Promise.reject('No guild.');

    if (ticket.subscription_message_id) {
        const subscriptionChannel = guild.channels.cache.get(settings.ticket.subscriptionChannelID);
        if (!(subscriptionChannel instanceof TextChannel)) return Promise.reject('Invalid subscription channel.');
        (await subscriptionChannel.messages.fetch(ticket.subscription_message_id)).delete();
    }

    if (ticket.channel_id) {
        const ticketChannel = guild.channels.cache.get(ticket.channel_id);
        if (ticketChannel) ticketChannel.delete();
    }
}

export async function deleteTicket(args: string[], text: string, guild: Guild) {
    const response = await db.query(
        /*sql*/ `
        DELETE FROM ticket
        WHERE ${uuid.test(args[0]) ? 'ticket.id = $1' : 'ticket.title = $1'} 
        RETURNING subscription_message_id, channel_id, title, author_id;`,
        [uuid.test(args[0]) ? args[0] : text]
    );

    if (response.rowCount === 0) {
        const similarResults = await db.query(
            /*sql*/ `
            SELECT id, title 
            FROM ticket
            ORDER BY SIMILARITY(title, $1) DESC
            LIMIT 3`,
            [text]
        );

        let errorMessage = 'No tickets were found.';
        if (similarResults.rowCount !== 0) errorMessage += '\nSimilar results:\n```' + similarResults.rows.map((row: any) => `${row.id} | ${row.title}`).join('\n') + '```';
        return Promise.reject(errorMessage);
    }

    const ticket = response.rows[0];

    if (ticket.subscription_message_id) {
        const subscriptionChannel = guild.channels.cache.get(settings.ticket.subscriptionChannelID);
        if (!(subscriptionChannel instanceof TextChannel)) return Promise.reject('Invalid subscription channel.');
        (await subscriptionChannel.messages.fetch(ticket.subscription_message_id)).delete();
    }

    if (ticket.channel_id) {
        const ticketChannel = guild.channels.cache.get(ticket.channel_id);
        if (ticketChannel) ticketChannel.delete();
    }

    return { title: ticket.title, author: ticket.author_id };
}

export async function purgeAllTickets(user: User, guild: Guild) {
    const response = await db.query(
        /*sql*/ `
        DELETE FROM ticket
        WHERE ticket.author_id = $1 
        RETURNING subscription_message_id, channel_id, title;`,
        [user.id]
    );

    if (response.rowCount === 0) {
        return Promise.reject(`<@${user.id}> does not have any tickets.`);
    }

    const titles: string[] = [];
    for (const ticket of response.rows) {
        if (ticket.subscription_message_id) {
            const subscriptionChannel = guild.channels.cache.get(settings.ticket.subscriptionChannelID);
            if (!(subscriptionChannel instanceof TextChannel)) return Promise.reject('Invalid subscription channel.');
            (await subscriptionChannel.messages.fetch(ticket.subscription_message_id)).delete();
        }

        if (ticket.channel_id) {
            const ticketChannel = guild.channels.cache.get(ticket.channel_id);
            if (ticketChannel) ticketChannel.delete();
        }

        titles.push(ticket.title);
    }

    return { titles: titles, amount: response.rowCount };
}

export async function getCategoryChannel(categoryIDs: string[], guild: Guild): Promise<CategoryChannel> {
    let lowestPosition = 0;
    for (const id of categoryIDs) {
        const category = guild.channels.cache.get(id);
        if (!(category instanceof CategoryChannel)) continue;

        if (category.children.size < 50) return category;
        lowestPosition = Math.max(lowestPosition, category.rawPosition + category.children.size);
    }

    // CREATE NEW CATEGORY
    const newCategory = await guild.channels.create(`Tickets #${categoryIDs.length + 1}`, {
        type: 'category',
        position: lowestPosition + 1,
        reason: 'Create new category for tickets.',
    });

    settings.ticket.categoryIDs.push(newCategory.id);
    update();

    return newCategory;
}

export function cutDescription(str: string) {
    if (str.length <= 950) return str;
    return str.substr(0, str.lastIndexOf(' ', 950));
}
