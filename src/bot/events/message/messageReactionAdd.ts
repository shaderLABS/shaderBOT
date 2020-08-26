import { Event } from '../../eventHandler.js';
import { MessageReaction, User, TextChannel, Message, GuildMember, Guild, GuildChannel } from 'discord.js';
import { settings, client } from '../../bot.js';
import Ticket from '../../../db/models/Ticket.js';
import log from '../../../misc/log.js';

export const event: Event = {
    name: 'messageReactionAdd',
    callback: async (reaction: MessageReaction, user: User) => {
        const channel = reaction.message.channel;
        if (!(channel instanceof TextChannel) || user.bot || channel.parentID !== settings.ticket.categoryID) return;

        const guild = client.guilds.cache.first();
        if (!guild) return;

        const member = await guild.members.fetch(user);
        if (!member) return;

        if (reaction.emoji.name === '✏️') edit(reaction, user, guild, channel);
        else if (reaction.emoji.name === '❌') deleteComment(reaction, user, member, channel);
    },
};

async function edit(reaction: MessageReaction, user: User, guild: Guild, channel: TextChannel) {
    const ticket = await Ticket.findOne({ channel: channel.id });
    if (!ticket || !ticket.comments) return;

    const comment = ticket.comments.find((comment) => comment.message === reaction.message.id);

    if (!comment) {
        const originalMessage = await channel.messages.fetch(reaction.message.id);
        if (!originalMessage) return;

        const subscriptionChannel = guild.channels.cache.get(settings.ticket.subscriptionChannelID);

        let subscriptionMessage;
        if (subscriptionChannel instanceof TextChannel && ticket.subscriptionMessage) {
            subscriptionMessage = await subscriptionChannel.messages.fetch(ticket.subscriptionMessage);
        }

        const embed = originalMessage.embeds[0];
        if (
            !embed ||
            !embed.footer ||
            !embed.footer.text ||
            embed.footer.text.split(' | ')[0].substring(4) != ticket._id ||
            ticket.author !== user.id
        )
            return reaction.remove();

        const originalEmbed = embed;

        const managementChannel = guild.channels.cache.get(settings.ticket.managementChannelID);
        if (!managementChannel || !(managementChannel instanceof TextChannel)) return;
        const editPartQuestion = await managementChannel.send(
            `<@${user.id}>, please enter the part of the ticket which you want to edit (title or description):`
        );

        const editPart = (
            await managementChannel.awaitMessages((msg) => msg.author.id === user.id, {
                time: 30000,
                max: 1,
            })
        ).first();

        if (!editPart) {
            reaction.remove();
            editPartQuestion.delete();
            return;
        }

        if (editPart.content.toLowerCase() === 'title') {
            const titleQuestion = await managementChannel.send(`<@${user.id}>, please enter the new title:`);

            const newTitle = (
                await managementChannel.awaitMessages((msg) => msg.author.id === user.id, {
                    time: 30000,
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

            ticket.title = newTitle.content;
            embed.fields[0].value = newTitle.content;

            if (ticket.channel) {
                const ticketChannel = guild.channels.cache.get(ticket.channel);
                if (ticketChannel instanceof TextChannel) {
                    ticketChannel.edit(
                        {
                            name: newTitle.content,
                        },
                        'the ticket title has been changed'
                    );
                }
            }

            editPartQuestion.delete();
            editPart.delete();
            titleQuestion.delete();
            newTitle.delete();

            log(
                `<@${user.id}> edited their ticket title from:\n\n${originalEmbed.fields[0].value}\n\nto:\n\n${newTitle.content}`
            );
        } else if (editPart.content.toLowerCase() === 'description') {
            const descriptionQuestion = await managementChannel.send(`<@${user.id}>, please enter the new description:`);

            const newDescription = (
                await managementChannel.awaitMessages((msg) => msg.author.id === user.id, {
                    time: 30000,
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

            ticket.description = newDescription.content;
            embed.fields[2].value = newDescription.content;

            editPartQuestion.delete();
            editPart.delete();
            descriptionQuestion.delete();
            newDescription.delete();

            log(
                `<@${user.id}> edited their ticket description from:\n\n${originalEmbed.fields[2].value}\n\nto:\n\n${newDescription.content}`
            );
        } else {
            reaction.remove();
            editPartQuestion.delete();
            editPart.delete();
            return;
        }

        ticket.edited = new Date().toISOString();

        if (!embed.footer || !embed.footer.text || !embed.footer.text.includes('edited'))
            embed.setFooter(embed.footer.text + ` | edited at ${new Date(ticket.edited).toLocaleString()}`);

        await originalMessage.edit(embed);
        if (subscriptionMessage) subscriptionMessage.edit(embed);

        ticket.save();
        reaction.remove();
    } else {
        if (comment.author !== user.id) return reaction.remove();

        const managementChannel = guild.channels.cache.get(settings.ticket.managementChannelID);
        if (!managementChannel || !(managementChannel instanceof TextChannel)) return;
        const question = await managementChannel.send(`<@${user.id}>, please enter the new message:`);

        const newMessage = (
            await managementChannel.awaitMessages((msg) => msg.author.id === user.id, {
                time: 30000,
                max: 1,
            })
        ).first();

        if (!newMessage) {
            await question.delete();
            return;
        }

        const originalMessage = await channel.messages.fetch(reaction.message.id);
        if (!originalMessage) return;

        const embed = originalMessage.embeds[0];
        const originalContent = embed.description;
        if (!embed) return;

        comment.content = newMessage.content;
        comment.edited = new Date().toISOString();

        if (!embed.footer || !embed.footer.text) embed.setFooter(`edited at ${new Date(comment.edited).toLocaleString()}`);
        embed.setDescription(newMessage.content);

        await originalMessage.edit(embed);

        ticket.save();
        reaction.remove();
        question.delete();
        newMessage.delete();

        log(`<@${user.id}> edited their ticket comment from:\n\n${originalContent}\n\nto:\n\n${newMessage.content}`);
    }
}

async function deleteComment(reaction: MessageReaction, user: User, member: GuildMember, channel: TextChannel) {
    const ticket = await Ticket.findOne({ channel: channel.id });
    if (!ticket || !ticket.comments) return;

    const comment = ticket.comments.find((comment) => comment.message === reaction.message.id);
    if (!comment) return;

    if (member.hasPermission('MANAGE_MESSAGES') || comment.author === user.id) {
        if (reaction.message.deletable) reaction.message.delete();
        else (await channel.messages.fetch(reaction.message.id)).delete();

        comment.remove();
        ticket.save();
        log(`Removed ticket comment from <#${ticket.channel}>:\n\n${comment.content}`);
    } else {
        reaction.remove();
    }
}
