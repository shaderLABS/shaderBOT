import { Guild, GuildMember, MessageReaction, TextChannel, User } from 'discord.js';
import { db } from '../../../db/postgres.js';
import { settings } from '../../bot.js';
import { Event } from '../../eventHandler.js';
import { editComment } from '../../lib/edit/editTicket.js';
import { sendInfo } from '../../lib/embeds.js';
import log from '../../lib/log.js';
import { formatTimeDate, getGuild } from '../../lib/misc.js';
import { cutDescription } from '../../lib/ticketManagement.js';

export const event: Event = {
    name: 'messageReactionAdd',
    callback: async (reaction: MessageReaction, user: User) => {
        // *always* safe to access, even if partial
        const channel = reaction.message.channel;
        if (!(channel instanceof TextChannel) || user.bot || !channel.parentID || !settings.ticket.categoryIDs.includes(channel.parentID)) return;

        const guild = getGuild();
        if (!guild) return;

        const member = await guild.members.fetch(user).catch(() => undefined);
        if (!member) return;

        if (reaction.emoji.name === '✏️') edit(reaction, user, guild, channel);
        else if (reaction.emoji.name === '❌') deleteComment(reaction, member, channel);
    },
};

async function edit(reaction: MessageReaction, user: User, guild: Guild, channel: TextChannel) {
    const comment = (await db.query(/*sql*/ `SELECT id, author_id, content FROM comment WHERE message_id = $1 LIMIT 1`, [reaction.message.id])).rows[0];

    if (!comment) {
        /***************
         * EDIT TICKET *
         ***************/

        const ticket = (await db.query(/*sql*/ `SELECT id, author_id, channel_id, subscription_message_id FROM ticket WHERE channel_id = $1 LIMIT 1`, [channel.id])).rows[0];
        if (!ticket) return;

        const originalMessage = await channel.messages.fetch(reaction.message.id);
        if (!originalMessage) return;

        const subscriptionChannel = guild.channels.cache.get(settings.ticket.subscriptionChannelID);

        let subscriptionMessage;
        if (subscriptionChannel instanceof TextChannel && ticket.subscription_message_id) {
            subscriptionMessage = await subscriptionChannel.messages.fetch(ticket.subscription_message_id);
        }

        const embed = originalMessage.embeds[0];
        if (!embed || !embed.footer || !embed.footer.text || embed.footer.text.split(' | ')[0].substring(4) != ticket.id || ticket.author_id !== user.id)
            return reaction.remove();

        const originalFieldValues = [embed.title, embed.fields[1].value];

        const managementChannel = guild.channels.cache.get(settings.ticket.managementChannelID);
        if (!managementChannel || !(managementChannel instanceof TextChannel)) return;
        const editPartQuestion = await sendInfo(
            managementChannel,
            'Please enter the part of the ticket which you want to edit (`title` or `description`):',
            undefined,
            `<@${user.id}>`
        );

        const editPart = (
            await managementChannel.awaitMessages((msg) => msg.author.id === user.id, {
                time: 60000,
                max: 1,
            })
        ).first();

        if (!editPart) {
            reaction.remove();
            editPartQuestion.delete();
            return;
        }

        const editedAt = new Date();

        if (editPart.content.toLowerCase() === 'title') {
            /*********************
             * EDIT TICKET TITLE *
             *********************/

            const titleQuestion = await sendInfo(managementChannel, 'Please enter the new title:', undefined, `<@${user.id}>`);

            const newTitle = (
                await managementChannel.awaitMessages((msg) => msg.author.id === user.id, {
                    time: 60000,
                    max: 1,
                })
            ).first();

            if (!newTitle) {
                reaction.remove();
                editPartQuestion.delete();
                editPart.delete();
                titleQuestion.delete();
                return;
            }

            embed.setTitle(newTitle.content);

            if (ticket.channel_id) {
                const ticketChannel = guild.channels.cache.get(ticket.channel_id);
                if (ticketChannel instanceof TextChannel) {
                    ticketChannel.edit(
                        {
                            name: newTitle.content,
                        },
                        'the ticket title has been changed'
                    );
                }
            }

            await db.query(/*sql*/ `UPDATE ticket SET title = $1, edited = $2 WHERE id = $3`, [newTitle.content, editedAt, ticket.id]);

            editPartQuestion.delete();
            editPart.delete();
            titleQuestion.delete();
            newTitle.delete();

            log(`<@${user.id}> edited their ticket title from:\n\n${originalFieldValues[0] || '<empty comment>'}\n\nto:\n\n${newTitle.content}`);
        } else if (editPart.content.toLowerCase() === 'description') {
            /***************************
             * EDIT TICKET DESCRIPTION *
             ***************************/

            const descriptionQuestion = await sendInfo(managementChannel, 'Please enter the new description:', undefined, `<@${user.id}>`);

            const newDescription = (
                await managementChannel.awaitMessages((msg) => msg.author.id === user.id, {
                    time: 60000,
                    max: 1,
                })
            ).first();

            if (!newDescription) {
                reaction.remove();
                editPartQuestion.delete();
                editPart.delete();
                descriptionQuestion.delete();
                return;
            }

            embed.fields[1].value = newDescription.content;

            if (ticket.channel_id) {
                const ticketChannel = guild.channels.cache.get(ticket.channel_id);
                if (ticketChannel instanceof TextChannel && ticketChannel.topic) {
                    const lastSection = ticketChannel.topic.lastIndexOf('|');
                    if (lastSection > -1) {
                        ticketChannel.edit(
                            {
                                topic: ticketChannel.topic.substring(0, lastSection + 2) + (cutDescription(newDescription.content) || 'NO DESCRIPTION'),
                            },
                            'the ticket description has been changed'
                        );
                    }
                }
            }

            await db.query(/*sql*/ `UPDATE ticket SET description = $1, edited = $2 WHERE id = $3`, [newDescription.content, editedAt, ticket.id]);

            editPartQuestion.delete();
            editPart.delete();
            descriptionQuestion.delete();
            newDescription.delete();

            log(`<@${user.id}> edited their ticket description from:\n\n${originalFieldValues[1]}\n\nto:\n\n${newDescription.content}`);
        } else {
            reaction.remove();
            editPartQuestion.delete();
            editPart.delete();
            return;
        }

        if (embed.footer && embed.footer.text) embed.setFooter(embed.footer.text.split(' | ')[0] + ` | edited at ${formatTimeDate(editedAt)}`);

        await originalMessage.edit(embed);
        if (subscriptionMessage) subscriptionMessage.edit(embed);

        reaction.remove();
    } else {
        /****************
         * EDIT COMMENT *
         ****************/

        if (comment.author_id !== user.id) return reaction.remove();

        const managementChannel = guild.channels.cache.get(settings.ticket.managementChannelID);
        if (!managementChannel || !(managementChannel instanceof TextChannel)) return;
        const question = await sendInfo(managementChannel, 'Please enter the new message:', undefined, `<@${user.id}>`);

        const newMessage = (
            await managementChannel.awaitMessages((msg) => msg.author.id === user.id, {
                time: 60000,
                max: 1,
            })
        ).first();

        if (!newMessage) {
            await question.delete();
            return;
        }

        const originalMessage = await channel.messages.fetch(reaction.message.id);
        if (!originalMessage) return;

        editComment(comment.id, originalMessage, newMessage.content);

        reaction.remove();
        question.delete();
        newMessage.delete();

        log(`<@${user.id}> edited their ticket comment from:\n\n${comment.content}\n\nto:\n\n${newMessage.content}`);
    }
}

async function deleteComment(reaction: MessageReaction, member: GuildMember, channel: TextChannel) {
    const id = (await db.query(/*sql*/ `SELECT id FROM ticket WHERE channel_id = $1 LIMIT 1;`, [channel.id])).rows[0]?.id;
    if (!id) return;

    const managePerm = member.hasPermission('MANAGE_MESSAGES');

    const comment = (
        await db.query(
            /*sql*/ `
            DELETE FROM comment 
            WHERE ticket_id = $1 AND message_id = $2 ${managePerm ? '' : 'AND author_id = $3'}
            RETURNING content, author_id`,
            managePerm ? [id, reaction.message.id] : [id, reaction.message.id, member.id]
        )
    ).rows[0];

    if (!comment) return reaction.remove();

    if (!reaction.partial && reaction.message.deletable === true) reaction.message.delete();
    else (await channel.messages.fetch(reaction.message.id)).delete();

    log(`<@${member.id}> deleted ${member.id === comment.author_id ? 'their' : `<@${comment.author_id}>`} ticket comment from <#${channel.id}>:\n\n${comment.content}`);
}
