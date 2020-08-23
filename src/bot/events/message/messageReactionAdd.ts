import { Event } from '../../eventHandler.js';
import { MessageReaction, User, TextChannel, Message, GuildMember } from 'discord.js';
import { settings, client } from '../../bot.js';
import Ticket from '../../../db/models/Ticket.js';
import log from '../../../misc/log.js';

export const event: Event = {
    name: 'messageReactionAdd',
    callback: async (reaction: MessageReaction, user: User) => {
        const channel = reaction.message.channel;
        if (!(channel instanceof TextChannel) || user.bot || channel.parentID !== settings.ticketCategoryID) return;

        const guild = client.guilds.cache.first();
        if (!guild) return;
        const member = await guild.members.fetch(user);
        if (!member) return;

        if (reaction.emoji.name === '✏️') {
            const ticket = await Ticket.findOne({ channel: channel.id });
            if (!ticket || !ticket.comments) return;

            const comment = ticket.comments.find((comment) => comment.message === reaction.message.id);
            if (!comment) return;

            if (comment.author !== user.id) return reaction.remove();

            const managementChannel = guild.channels.cache.get(settings.manageTicketsChannelID);
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
            if (!embed || !embed.footer || !embed.footer.text) return;

            if (!embed.footer.text.includes('(edited)')) embed.setFooter(embed.footer.text + ' (edited)');
            embed.setDescription(newMessage.content);

            await originalMessage.edit(embed);
            comment.content = newMessage.content;
            comment.edited = true;

            ticket.save();
            reaction.remove();
            question.delete();
            newMessage.delete();

            log(`<@${user.id}> edited their ticket comment from:\n\n${originalContent}\n\nto:\n\n${newMessage.content}`);
        } else if (reaction.emoji.name === '❌') {
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
    },
};
