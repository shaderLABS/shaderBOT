import { Event } from '../../eventHandler.js';
import { Message, TextChannel, MessageEmbed } from 'discord.js';
import { commands, settings } from '../../bot.js';
import { runCommand } from '../../commandHandler.js';
import Ticket from '../../../db/models/Ticket.js';
import mongoose from 'mongoose';

export const event: Event = {
    name: 'message',
    callback: (message: Message) => {
        const { content, channel } = message;

        if (!(channel instanceof TextChannel) || message.author.bot) return;
        if (channel.parentID === settings.ticket.categoryID) return ticketComment(message);
        if (!content.startsWith(settings.prefix)) return;

        const [invoke, ...args] = content.slice(settings.prefix.length).trim().split(/[ ]+/);
        const command = commands.find((_value, key) => JSON.parse(key).includes(invoke));
        if (command) runCommand(command, message, invoke, args);
    },
};

async function ticketComment(message: Message) {
    const { channel, member, content, attachments } = message;
    if (message.partial || !(channel instanceof TextChannel) || !channel.topic || !member) return;

    const id = channel.topic.split(' | ')[0];

    const comment: {
        _id: mongoose.Types.ObjectId;
        author: string;
        message: string;
        content: string;
        timestamp: string;
        attachments?: string[];
    } = {
        _id: new mongoose.Types.ObjectId(),
        author: member.id,
        message: '',
        content,
        timestamp: new Date().toISOString(),
    };

    const commentEmbed = new MessageEmbed()
        .setColor(message.member?.displayHexColor || '#212121')
        .setAuthor(member.user.username + '#' + member.user.discriminator, member.user.avatarURL() || undefined)
        .setTimestamp(new Date(comment.timestamp))
        .setDescription(content);

    if (attachments && attachments.size !== 0) {
        let attachmentURLs: string[] = [];
        const attachmentStorage = message.guild?.channels.cache.get(settings.ticket.attachmentCacheChannelID);
        if (!attachmentStorage || !(attachmentStorage instanceof TextChannel)) return;

        for (const attachment of attachments) {
            const storedAttachment = (await attachmentStorage.send(attachment)).attachments.first();
            if (storedAttachment) attachmentURLs.push(storedAttachment.url);
        }

        commentEmbed.attachFiles(attachmentURLs);
        comment.attachments = attachmentURLs;
    }

    await message.delete();

    const commentMessage = await channel.send(commentEmbed);

    comment.message = commentMessage.id;

    await Ticket.findByIdAndUpdate(id, {
        $push: {
            comments: comment,
        },
    });
}
