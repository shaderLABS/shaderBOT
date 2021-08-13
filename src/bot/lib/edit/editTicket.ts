import { Guild, Message, TextChannel, User } from 'discord.js';
import { db } from '../../../db/postgres.js';
import log from '../log.js';
import { parseUser } from '../misc.js';
import { cutDescription } from '../ticketManagement.js';
import { formatTimeDate } from '../time.js';

export async function editComment(comment: any, message: Message, newContent: string, user: User) {
    const embed = message.embeds[0];
    if (!embed) return;

    const editedAt = new Date();

    embed.setFooter(`edited at ${formatTimeDate(editedAt)}`);
    embed.setDescription(newContent);

    await message.edit({ embeds: [embed] });

    db.query(
        /*sql*/ `
        UPDATE comment
        SET content = $1, edited = $2
        WHERE id = $3`,
        [newContent, editedAt, comment.id]
    );

    log(`${parseUser(user)} edited their ticket comment from:\n\n${comment.content}\n\nto:\n\n${newContent}`, 'Edit Ticket Comment');
}

export async function editTicketTitle(ticket: any, newTitle: string, user: User, guild: Guild, originalMessage: Message) {
    // VALIDATION
    if (newTitle.length > 32 || newTitle.length < 2) return Promise.reject('The title must be between 2 and 32 characters long.');
    if ((await db.query(/*sql*/ `SELECT 1 FROM ticket WHERE title = $1`, [newTitle])).rows[0]) return Promise.reject('A ticket with this name already exists.');

    const embed = originalMessage.embeds[0];
    const originalTitle = embed.title;
    embed.setTitle(newTitle);

    if (ticket.channel_id) {
        const ticketChannel = guild.channels.cache.get(ticket.channel_id);
        if (ticketChannel instanceof TextChannel) {
            ticketChannel.edit(
                {
                    name: newTitle,
                },
                'The title of the ticket has been edited.'
            );
        }
    }

    const editedTimestamp = new Date();
    await db.query(/*sql*/ `UPDATE ticket SET title = $1, edited = $2 WHERE id = $3`, [newTitle, editedTimestamp, ticket.id]);

    log(`${parseUser(user)} edited their ticket title from:\n\n${originalTitle}\n\nto:\n\n${newTitle}`, 'Edit Ticket Title');

    if (embed.footer?.text) embed.setFooter(embed.footer.text.split(' | ')[0] + ` | edited at ${formatTimeDate(editedTimestamp)}`);
    originalMessage.edit({ embeds: [embed] });
}

export async function editTicketDescription(ticket: any, newDescription: string, user: User, guild: Guild, originalMessage: Message) {
    // VALIDATION
    if (newDescription.length > 1024) return Promise.reject('The description may not be longer than 1024 characters.');
    if ((!originalMessage.attachments || originalMessage.attachments.size === 0) && !newDescription) return Promise.reject('The description may not be empty.');

    const embed = originalMessage.embeds[0];
    const originalDescription = embed.fields[1].value;
    embed.fields[1].value = newDescription;

    if (ticket.channel_id) {
        const ticketChannel = guild.channels.cache.get(ticket.channel_id);
        if (ticketChannel instanceof TextChannel && ticketChannel.topic) {
            const lastSection = ticketChannel.topic.indexOf('|', ticketChannel.topic.indexOf('|') + 1);
            if (lastSection > -1) {
                ticketChannel.edit(
                    {
                        topic: ticketChannel.topic.substring(0, lastSection + 2) + (cutDescription(newDescription) || 'NO DESCRIPTION'),
                    },
                    'The description of the ticket has been edited.'
                );
            }
        }
    }

    const editedTimestamp = new Date();
    await db.query(/*sql*/ `UPDATE ticket SET description = $1, edited = $2 WHERE id = $3`, [newDescription, editedTimestamp, ticket.id]);

    log(`${parseUser(user)} edited their ticket description from:\n\n${originalDescription}\n\nto:\n\n${newDescription}`, 'Edit Ticket Description');

    if (embed.footer?.text) embed.setFooter(embed.footer.text.split(' | ')[0] + ` | edited at ${formatTimeDate(editedTimestamp)}`);
    originalMessage.edit({ embeds: [embed] });
}
