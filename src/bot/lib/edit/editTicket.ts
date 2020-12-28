import { Guild, Message, TextChannel, User } from 'discord.js';
import { db } from '../../../db/postgres.js';
import log from '../log.js';
import { formatTimeDate } from '../misc.js';
import { cutDescription } from '../ticketManagement.js';

export async function editComment(comment: any, message: Message, newContent: string, user: User) {
    const embed = message.embeds[0];
    if (!embed) return;

    const editedAt = new Date();

    embed.setFooter(`edited at ${formatTimeDate(editedAt)}`);
    embed.setDescription(newContent);

    await message.edit(embed);

    db.query(
        /*sql*/ `
        UPDATE comment 
        SET content = $1, edited = $2 
        WHERE id = $3`,
        [newContent, editedAt, comment.id]
    );

    log(`<@${user.id}> edited their ticket comment from:\n\n${comment.content}\n\nto:\n\n${newContent}`);
}

export async function editTicketTitle(ticket: any, newTitle: string, user: User, guild: Guild, originalMessage: Message, subscriptionMessage?: Message) {
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

    log(`<@${user.id}> edited their ticket title from:\n\n${originalTitle}\n\nto:\n\n${newTitle}`);

    if (embed.footer?.text) embed.setFooter(embed.footer.text.split(' | ')[0] + ` | edited at ${formatTimeDate(editedTimestamp)}`);
    originalMessage.edit(embed);
    if (subscriptionMessage) subscriptionMessage.edit(embed);
}

export async function editTicketDescription(ticket: any, newDescription: string, user: User, guild: Guild, originalMessage: Message, subscriptionMessage?: Message) {
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

    log(`<@${user.id}> edited their ticket description from:\n\n${originalDescription}\n\nto:\n\n${newDescription}`);

    if (embed.footer?.text) embed.setFooter(embed.footer.text.split(' | ')[0] + ` | edited at ${formatTimeDate(editedTimestamp)}`);
    originalMessage.edit(embed);
    if (subscriptionMessage) subscriptionMessage.edit(embed);
}
