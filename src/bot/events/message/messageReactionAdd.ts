import { Guild, GuildMember, MessageReaction, TextChannel, User } from 'discord.js';
import { db } from '../../../db/postgres.js';
import { settings } from '../../bot.js';
import { Event } from '../../eventHandler.js';
import { editComment, editTicketDescription, editTicketTitle } from '../../lib/edit/editTicket.js';
import { sendError, sendInfo } from '../../lib/embeds.js';
import log from '../../lib/log.js';
import { getGuild, parseUser } from '../../lib/misc.js';
import { deleteAttachmentFromDiscord } from '../../lib/ticketManagement.js';

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

        const ticket = (await db.query(/*sql*/ `SELECT id, author_id, channel_id FROM ticket WHERE channel_id = $1 LIMIT 1`, [channel.id])).rows[0];
        if (!ticket) return;

        const originalMessage = await channel.messages.fetch(reaction.message.id);
        if (!originalMessage) return;

        const embed = originalMessage.embeds[0];
        if (!embed?.footer?.text?.includes(ticket.id) || ticket.author_id !== user.id) return;

        const botChannel = guild.channels.cache.get(settings.botChannelID);
        if (!(botChannel instanceof TextChannel)) return;

        const editPartQuestion = await sendInfo(
            botChannel,
            'Please enter the part of the ticket which you want to edit (`title` or `description`).',
            undefined,
            `<@${user.id}>`,
            `Type '${settings.prefix}cancel' to stop.`
        );

        const editPartAnswer = await awaitResponse(botChannel, user.id).catch((error) => {
            if (error) sendError(botChannel, error);
        });

        if (!editPartAnswer || !['TITLE', 'DESCRIPTION'].includes(editPartAnswer.content.toUpperCase())) {
            reaction.users.remove(user);
            editPartQuestion.delete();
            return;
        }

        if (editPartAnswer.content.toUpperCase() === 'TITLE') {
            /*********************
             * EDIT TICKET TITLE *
             *********************/

            const titleQuestion = await sendInfo(botChannel, 'Please enter the new title.', undefined, undefined, `Type '${settings.prefix}cancel' to stop.`);

            try {
                const titleAnswer = await awaitResponse(botChannel, user.id);
                editTicketTitle(ticket, titleAnswer.content, user, guild, originalMessage);
                titleAnswer.delete();
            } catch (error) {
                if (error) sendError(botChannel, error);
            } finally {
                reaction.users.remove(user);
                editPartQuestion.delete();
                editPartAnswer.delete();
                titleQuestion.delete();
            }
        } else {
            /***************************
             * EDIT TICKET DESCRIPTION *
             ***************************/

            const descriptionQuestion = await sendInfo(botChannel, 'Please enter the new description.', undefined, undefined, `Type '${settings.prefix}cancel' to stop.`);

            try {
                const descriptionAnswer = await awaitResponse(botChannel, user.id);
                editTicketDescription(ticket, descriptionAnswer.content, user, guild, originalMessage);
                descriptionAnswer.delete();
            } catch (error) {
                if (error) sendError(botChannel, error);
            } finally {
                reaction.users.remove(user);
                editPartQuestion.delete();
                editPartAnswer.delete();
                descriptionQuestion.delete();
            }
        }
    } else {
        /****************
         * EDIT COMMENT *
         ****************/

        if (comment.author_id !== user.id) return reaction.users.remove(user);

        const botChannel = guild.channels.cache.get(settings.botChannelID);
        if (!(botChannel instanceof TextChannel)) return;

        const question = await sendInfo(botChannel, 'Please enter the new message.', undefined, `<@${user.id}>`, `Type '${settings.prefix}cancel' to stop.`);

        try {
            const answer = await awaitResponse(botChannel, user.id);

            const originalMessage = await channel.messages.fetch(reaction.message.id);
            if (!originalMessage) return;

            editComment(comment, originalMessage, answer.content, user);
            answer.delete();
        } catch (error) {
            if (error) sendError(botChannel, error);
        } finally {
            reaction.users.remove(user);
            question.delete();
        }
    }
}

async function awaitResponse(channel: TextChannel, authorID: string) {
    const response = (
        await channel.awaitMessages((msg) => msg.author.id === authorID, {
            time: 60000,
            max: 1,
        })
    ).first();

    if (!response) {
        sendInfo(channel, 'Stopped editing because there was no response.');
        return Promise.reject();
    }

    if (response.content === `${settings.prefix}cancel`) {
        sendInfo(channel, 'The editing was canceled.');
        return Promise.reject();
    }

    return response;
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
            RETURNING content, author_id, attachment`,
            managePerm ? [id, reaction.message.id] : [id, reaction.message.id, member.id]
        )
    ).rows[0];

    if (!comment) return;

    if (!reaction.partial && reaction.message.deletable) reaction.message.delete();
    else (await channel.messages.fetch(reaction.message.id)).delete();

    if (comment.attachment) deleteAttachmentFromDiscord(comment.attachment, member.guild);

    log(`${parseUser(member.user)} deleted ${member.id === comment.author_id ? 'their' : `${parseUser(comment.author_id)}'s`} ticket comment from <#${channel.id}>:\n\n${comment.content}`);
}
