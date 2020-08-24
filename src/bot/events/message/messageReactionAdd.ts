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

        if (reaction.emoji.name === '✏️') editComment(reaction, user, guild, channel);
        else if (reaction.emoji.name === '❌') deleteComment(reaction, user, member, channel);
    },
};

async function editComment(reaction: MessageReaction, user: User, guild: Guild, channel: TextChannel) {
    const ticket = await Ticket.findOne({ channel: channel.id });
    if (!ticket || !ticket.comments) return;

    const comment = ticket.comments.find((comment) => comment.message === reaction.message.id);

    if (!comment) {
        const originalMessage = await channel.messages.fetch(reaction.message.id);
        if (!originalMessage) return;
        const originalContent = originalMessage.content;

        const embed = originalMessage.embeds[0];
        if (
            !embed ||
            !embed.footer ||
            !embed.footer.text ||
            embed.footer.text.substring(4) !== ticket._id ||
            ticket.author !== user.id
        )
            return reaction.remove();

        const managementChannel = guild.channels.cache.get(settings.ticket.managementChannelID);
        if (!managementChannel || !(managementChannel instanceof TextChannel)) return;
        const question = await managementChannel.send(`<@${user.id}>, please enter the new ticket description:`);

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

        ticket.description = newMessage.content;
        ticket.edited = new Date().toISOString();

        if (!embed.footer || !embed.footer.text) embed.setFooter(`edited at ${new Date(ticket.edited).toLocaleString()}`);
        embed.setDescription(newMessage.content);

        await originalMessage.edit(embed);

        ticket.save();
        reaction.remove();
        question.delete();
        newMessage.delete();

        log(`<@${user.id}> edited their ticket description from:\n\n${originalContent}\n\nto:\n\n${newMessage.content}`);
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
