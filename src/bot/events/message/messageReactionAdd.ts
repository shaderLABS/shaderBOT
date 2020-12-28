import { Guild, GuildMember, MessageReaction, TextChannel, User } from 'discord.js';
import { db } from '../../../db/postgres.js';
import { settings } from '../../bot.js';
import { Event } from '../../eventHandler.js';
import { editComment, editTicketDescription, editTicketTitle } from '../../lib/edit/editTicket.js';
import { sendInfo } from '../../lib/embeds.js';
import log from '../../lib/log.js';
import { getGuild } from '../../lib/misc.js';

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

        let subscriptionMessage;
        const subscriptionChannel = guild.channels.cache.get(settings.ticket.subscriptionChannelID);
        if (subscriptionChannel instanceof TextChannel && ticket.subscription_message_id) {
            subscriptionMessage = await subscriptionChannel.messages.fetch(ticket.subscription_message_id);
        }

        const embed = originalMessage.embeds[0];
        if (!embed?.footer?.text?.includes(ticket.id) || ticket.author_id !== user.id) return reaction.remove();

        const managementChannel = guild.channels.cache.get(settings.ticket.managementChannelID);
        if (!(managementChannel instanceof TextChannel)) return;

        const editPartQuestion = await sendInfo(
            managementChannel,
            'Please enter the part of the ticket which you want to edit (`title` or `description`).',
            undefined,
            `<@${user.id}>`
        );

        const editPartAnswer = (
            await managementChannel.awaitMessages((msg) => msg.author.id === user.id, {
                time: 60000,
                max: 1,
            })
        ).first();

        if (!editPartAnswer || !['TITLE', 'DESCRIPTION'].includes(editPartAnswer.content.toUpperCase())) {
            reaction.remove();
            editPartQuestion.delete();
            return;
        }

        if (editPartAnswer.content.toUpperCase() === 'TITLE') {
            /*********************
             * EDIT TICKET TITLE *
             *********************/

            const titleQuestion = await sendInfo(managementChannel, 'Please enter the new title.');

            const titleAnswer = (
                await managementChannel.awaitMessages((msg) => msg.author.id === user.id, {
                    time: 60000,
                    max: 1,
                })
            ).first();

            if (!titleAnswer) {
                reaction.remove();
                editPartQuestion.delete();
                editPartAnswer.delete();
                titleQuestion.delete();
                return;
            }

            editTicketTitle(ticket, titleAnswer.content, user, guild, originalMessage, subscriptionMessage);

            titleQuestion.delete();
            titleAnswer.delete();
        } else {
            /***************************
             * EDIT TICKET DESCRIPTION *
             ***************************/

            const descriptionQuestion = await sendInfo(managementChannel, 'Please enter the new description.');

            const descriptionAnswer = (
                await managementChannel.awaitMessages((msg) => msg.author.id === user.id, {
                    time: 60000,
                    max: 1,
                })
            ).first();

            if (!descriptionAnswer) {
                reaction.remove();
                editPartQuestion.delete();
                editPartAnswer.delete();
                descriptionQuestion.delete();
                return;
            }

            editTicketDescription(ticket, descriptionAnswer.content, user, guild, originalMessage, subscriptionMessage);

            descriptionQuestion.delete();
            descriptionAnswer.delete();
        }

        reaction.remove();
        editPartQuestion.delete();
        editPartAnswer.delete();
    } else {
        /****************
         * EDIT COMMENT *
         ****************/

        if (comment.author_id !== user.id) return reaction.remove();

        const managementChannel = guild.channels.cache.get(settings.ticket.managementChannelID);
        if (!managementChannel || !(managementChannel instanceof TextChannel)) return;
        const question = await sendInfo(managementChannel, 'Please enter the new message.', undefined, `<@${user.id}>`);

        const answer = (
            await managementChannel.awaitMessages((msg) => msg.author.id === user.id, {
                time: 60000,
                max: 1,
            })
        ).first();

        if (!answer) {
            await question.delete();
            return;
        }

        const originalMessage = await channel.messages.fetch(reaction.message.id);
        if (!originalMessage) return;

        editComment(comment, originalMessage, answer.content, user);

        reaction.remove();
        question.delete();
        answer.delete();
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
