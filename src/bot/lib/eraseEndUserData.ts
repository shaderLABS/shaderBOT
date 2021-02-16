import { TextChannel } from 'discord.js';
import { db } from '../../db/postgres.js';
import { settings } from '../bot.js';
import { getGuild } from './misc.js';
import { deleteAttachmentFromDiscord, deleteTicketFromDiscord } from './ticketManagement.js';

export default async function (userID: string) {
    const guild = getGuild();
    if (!guild) return Promise.reject('No guild found.');

    const erasedTickets = await db.query(
        /*sql*/ `
        SELECT id 
        FROM ticket 
        WHERE author_id = $1;`,
        [userID]
    );

    erasedTickets.rows.forEach(async (row) => {
        (await db.query(/*sql*/ `DELETE FROM comment WHERE ticket_id = $1 RETURNING attachment;`, [row.id])).rows.forEach((comment) => {
            if (comment.attachment) deleteAttachmentFromDiscord(comment.attachment, guild);
        });

        const ticket = (await db.query(/*sql*/ `DELETE FROM ticket WHERE id = $1 RETURNING subscription_message_id, channel_id, closed, attachments;`, [row.id])).rows[0];
        deleteTicketFromDiscord(ticket, guild);
    });

    const erasedComments = await db.query(
        /*sql*/ `
        DELETE FROM comment 
        USING ticket
        WHERE comment.author_id = $1 AND comment.ticket_id = ticket.id
        RETURNING comment.message_id, ticket.channel_id, ticket.closed, comment.attachment;`,
        [userID]
    );

    erasedComments.rows.forEach(async (row) => {
        if (row.closed === false && row.channel_id && row.message_id) {
            const channel = guild.channels.cache.get(row.channel_id);
            if (!channel || !(channel instanceof TextChannel) || !settings.ticket.categoryIDs.includes(channel.id)) return;

            (await channel.messages.fetch(row.message_id)).delete();
        }

        if (row.attachment) deleteAttachmentFromDiscord(row.attachment, guild);
    });
}
