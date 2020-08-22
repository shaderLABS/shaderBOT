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
            //le edit
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
