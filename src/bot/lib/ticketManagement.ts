import { CategoryChannel, Guild, GuildMember, Message, MessageEmbed, Snowflake, TextChannel, User } from 'discord.js';
import uuid from 'uuid-random';
import { db } from '../../db/postgres.js';
import { client, settings } from '../bot.js';
import { update } from '../settings/settings.js';
import { embedColor } from './embeds.js';
import log from './log.js';
import { getGuild, parseUser, sleep } from './misc.js';
import { isSnowflake } from './searchMessage.js';
import { formatTimeDate } from './time.js';

export async function cacheAttachment(message: Message): Promise<string | undefined> {
    let fileUploadLimit = 8388119;
    if (message.guild?.premiumTier === 2) fileUploadLimit = 52428308;
    else if (message.guild?.premiumTier === 3) fileUploadLimit = 104856616;

    if (message.attachments.size > 1) return Promise.reject('You may not send more than one attachment in one message.');
    const attachment = message.attachments.first();

    if (attachment) {
        const attachmentStorage = message.guild?.channels.cache.get(settings.ticket.attachmentCacheChannelID);
        if (!attachmentStorage || !(attachmentStorage instanceof TextChannel)) return;

        if (attachment.size > fileUploadLimit) return Promise.reject('The attachment is too large.');

        const attachmentMessage = await attachmentStorage.send({ files: [attachment] });
        const storedAttachment = attachmentMessage.attachments.first();
        if (storedAttachment) return storedAttachment.url + '|' + attachmentMessage.id;
    }
}

function getSQLCondition(text: string) {
    if (/^\d+$/.test(text)) {
        return /*sql*/ `ticket.channel_id = $1::NUMERIC`;
    }
    if (uuid.test(text)) {
        return /*sql*/ `ticket.id = $1::UUID`;
    }
    return /*sql*/ `ticket.title = $1::TEXT`;
}

export async function openTicket(text: string, member: GuildMember, moderate: boolean = false) {
    const { guild } = member;

    const response = await db.query(
        /*sql*/ `
        SELECT ticket.id, title, project_channel_id, description, author_id, edited, attachments, timestamp
        FROM ticket
        ${moderate ? '' : 'LEFT JOIN project ON ticket.project_channel_id = project.channel_id'}
        WHERE ${getSQLCondition(text)}
            ${moderate ? '' : 'AND ($2::NUMERIC = ANY (project.owners) OR ticket.author_id = $2)'}
            AND closed = TRUE
        LIMIT 1;`,
        moderate ? [text] : [text, member.id]
    );

    if (response.rowCount === 0) {
        const similarResults = await db.query(
            /*sql*/ `
            SELECT ticket.id, title
            FROM ${moderate ? 'ticket' : 'ticket LEFT JOIN project ON ticket.project_channel_id = project.channel_id'}
            WHERE ticket.closed = TRUE
                ${moderate ? '' : 'AND ($2::NUMERIC = ANY (project.owners) OR ticket.author_id = $2)'}
            ORDER BY SIMILARITY(title, $1::TEXT) DESC
            LIMIT 3;`,
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
        parent: settings.ticket.openCategoryID,
        topic: `${ticket.id} | ${ticket.project_channel_id ? '<#' + ticket.project_channel_id + '>' : 'DELETED PROJECT'} | ${cutDescription(ticket.description) || 'NO DESCRIPTION'}`,
        rateLimitPerUser: 10,
    });

    const ticketAuthor = await client.users.fetch(ticket.author_id);

    let ticketFooter = `ID: ${ticket.id}`;
    if (ticket.edited) ticketFooter += ` | edited at ${formatTimeDate(new Date(ticket.edited))}`;

    const ticketEmbed = new MessageEmbed()
        .setAuthor(ticketAuthor.tag, ticketAuthor.displayAvatarURL() || undefined)
        .setTitle(ticket.title)
        .setColor(embedColor.blue)
        .setFooter(ticketFooter)
        .addFields([
            {
                name: 'Project',
                value: ticket.project_channel_id ? '<#' + ticket.project_channel_id + '>' : 'DELETED PROJECT',
            },
            {
                name: 'Description',
                value: ticket.description || 'NO DESCRIPTION',
            },
        ])
        .setTimestamp(new Date(ticket.timestamp));

    const attachments = ticket.attachments?.filter(Boolean);
    if (attachments) ticketEmbed.attachFiles(attachments.map((attachment: any) => attachment.split('|')[0]));

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
        SELECT id, author_id, edited, timestamp, content, attachment
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
                displayHexColor: '#000000',
                user: await client.users.fetch(comment.author_id).catch(() => undefined),
            };

            const commentEmbed = new MessageEmbed()
                .setColor(author.displayHexColor === '#000000' ? '#212121' : author.displayHexColor)
                .setAuthor(author.user?.tag || 'Deleted User', author.user?.displayAvatarURL() || undefined)
                .setFooter(comment.edited ? `edited at ${formatTimeDate(new Date(comment.edited))}` : '')
                .setTimestamp(new Date(comment.timestamp))
                .setDescription(comment.content);

            if (comment.attachment) commentEmbed.attachFiles([comment.attachment.split('|')[0]]);
            const commentMessage = await ticketChannel.send(commentEmbed);
            commentMessageQuery += /*sql*/ `UPDATE comment SET message_id = ${commentMessage.id} WHERE id = '${comment.id}';\n`;

            await sleep(1000);
        }

        await db.query(commentMessageQuery);
    }

    ticketChannel.setParent(await getCategoryChannel(settings.ticket.categoryIDs, guild), { lockPermissions: true });

    ticket.closed = false;
    return ticket;
}

export async function closeTicket(text: string, member: GuildMember, moderate: boolean = false) {
    const response = await db.query(
        /*sql*/ `
        UPDATE ticket
        SET closed = TRUE
        ${moderate ? '' : 'FROM ticket t LEFT JOIN project ON t.project_channel_id = project.channel_id'}
        WHERE ${getSQLCondition(text)}
            ${moderate ? '' : 'AND ($2::NUMERIC = ANY (project.owners) OR ticket.author_id = $2)'}
            AND ticket.closed = FALSE
        RETURNING ticket.subscription_message_id, ticket.channel_id, ticket.title, ticket.author_id;`,
        moderate ? [text] : [text, member.id]
    );

    if (response.rowCount === 0) {
        const similarResults = await db.query(
            /*sql*/ `
            SELECT ticket.id, title
            FROM ${moderate ? 'ticket' : 'ticket LEFT JOIN project ON ticket.project_channel_id = project.channel_id'}
            WHERE ticket.closed = FALSE
                ${moderate ? '' : 'AND ($2::NUMERIC = ANY (project.owners) OR ticket.author_id = $2)'}
            ORDER BY SIMILARITY(title, $1::TEXT) DESC
            LIMIT 3;`,
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

export async function deleteTicket(text: string, guild: Guild) {
    const response = await db.query(
        /*sql*/ `
        SELECT id FROM ticket
        WHERE ${getSQLCondition(text)};`,
        [text]
    );

    if (response.rowCount === 0) {
        const similarResults = await db.query(
            /*sql*/ `
            SELECT id, title
            FROM ticket
            ORDER BY SIMILARITY(title, $1::TEXT) DESC
            LIMIT 3`,
            [text]
        );

        let errorMessage = 'No tickets were found.';
        if (similarResults.rowCount !== 0) errorMessage += '\nSimilar results:\n```' + similarResults.rows.map((row: any) => `${row.id} | ${row.title}`).join('\n') + '```';
        return Promise.reject(errorMessage);
    }

    const ticketID = response.rows[0].id;

    (await db.query(/*sql*/ `DELETE FROM comment WHERE ticket_id = $1 RETURNING message_id, attachment;`, [ticketID])).rows.forEach((comment) => {
        if (comment.attachment) deleteAttachmentFromDiscord(comment.attachment, guild);
    });

    const ticket = (await db.query(/*sql*/ `DELETE FROM ticket WHERE id = $1 RETURNING subscription_message_id, channel_id, title, author_id, closed, attachments;`, [ticketID])).rows[0];
    deleteTicketFromDiscord(ticket, guild);

    return { title: ticket.title, author: ticket.author_id };
}

export async function deleteAttachmentFromDiscord(attachment: string, guild: Guild) {
    const messageID = attachment.split('|')[1];

    const attachmentCache = guild.channels.cache.get(settings.ticket.attachmentCacheChannelID);
    if (!attachmentCache || !(attachmentCache instanceof TextChannel) || !isSnowflake(messageID)) return log('Failed to delete comment attachment `' + attachment + '`!');

    (await attachmentCache.messages.fetch(messageID)).delete();
}

export async function deleteTicketFromDiscord(ticket: { subscription_message_id?: Snowflake; channel_id?: Snowflake; attachments?: string[]; closed: boolean }, guild: Guild) {
    const attachments = ticket.attachments?.filter(Boolean);
    if (attachments) attachments.forEach((attachment) => deleteAttachmentFromDiscord(attachment, guild));

    if (ticket.closed === false) {
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
}

export async function purgeAllTickets(user: User, guild: Guild) {
    const ticketIDs = await db.query(
        /*sql*/ `
        SELECT id FROM ticket
        WHERE ticket.author_id = $1;`,
        [user.id]
    );

    if (ticketIDs.rowCount === 0) {
        return Promise.reject(`${parseUser(user)} does not have any tickets.`);
    }

    const titles: string[] = [];
    for (const ticketID of ticketIDs.rows) {
        (await db.query(/*sql*/ `DELETE FROM comment WHERE ticket_id = $1 RETURNING attachment;`, [ticketID.id])).rows.forEach((comment) => {
            if (comment.attachment) deleteAttachmentFromDiscord(comment.attachment, guild);
        });

        const ticket = (await db.query(/*sql*/ `DELETE FROM ticket WHERE id = $1 RETURNING subscription_message_id, channel_id, title, closed, attachments;`, [ticketID.id])).rows[0];
        deleteTicketFromDiscord(ticket, guild);

        titles.push(ticket.title);
    }

    return { titles, amount: ticketIDs.rowCount };
}

export async function getCategoryChannel(categoryIDs: Snowflake[], guild: Guild): Promise<CategoryChannel> {
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
        permissionOverwrites: [{ id: settings.muteRoleID, deny: ['SEND_MESSAGES', 'SPEAK', 'ADD_REACTIONS'] }],
    });

    settings.ticket.categoryIDs.push(newCategory.id);
    update();

    return newCategory;
}

export function cutDescription(str: string) {
    if (str.length <= 950) return str;
    return str.substr(0, str.lastIndexOf(' ', 950)) + '...';
}
