import { Event } from '../eventHandler.js';
import { Message, TextChannel, MessageEmbed } from 'discord.js';
import { commands, settings } from '../bot.js';
import { runCommand } from '../commandHandler.js';
import Ticket from '../../db/models/Ticket.js';
import mongoose from 'mongoose';

export const event: Event = {
    name: 'message',
    callback: (message: Message) => {
        const { content, channel } = message;

        if (!(channel instanceof TextChannel) || message.author.bot) return;
        if (channel.parentID === settings.ticketCategoryID) return ticketComment(message);
        if (!content.startsWith(settings.prefix)) return;

        const [invoke, ...args] = content.slice(settings.prefix.length).trim().split(/[ ]+/);
        const command = commands.get(invoke);
        if (command) runCommand(command, message, invoke, args);
    },
};

async function ticketComment(message: Message) {
    const { channel, member, content } = message;
    if (!(channel instanceof TextChannel) || !channel.topic || !member) return;

    const id = channel.topic.split(' | ')[0];

    const comment = {
        _id: new mongoose.Types.ObjectId(),
        author: member.id,
        content,
        timestamp: new Date().toISOString(),
    };

    await Ticket.findByIdAndUpdate(id, {
        $push: {
            comments: comment,
        },
    });

    await message.delete();
    channel.send(
        new MessageEmbed()
            .setAuthor(member.user.username + '#' + member.user.discriminator, member.user.avatarURL() || undefined)
            .setFooter('ID: ' + comment._id)
            .setTimestamp(new Date(comment.timestamp))
            .setDescription(content)
    );
}
