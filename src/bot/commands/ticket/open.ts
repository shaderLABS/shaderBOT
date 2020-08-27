import { Command } from '../../commandHandler.js';
import { Message, MessageEmbed, TextChannel } from 'discord.js';
import { settings, client } from '../../bot.js';
import { getTicket } from '../../../misc/searchMessage.js';
import { sendSuccess, sendError } from '../../../misc/embeds.js';
import log from '../../../misc/log.js';

export const command: Command = {
    commands: ['open'],
    expectedArgs: '<ticketID|ticketTitle>',
    minArgs: 1,
    maxArgs: null,
    superCommand: 'ticket',
    callback: async (message: Message, args: string[], text: string) => {
        const { guild, member, channel } = message;
        if (!guild || !member || channel.id !== settings.ticket.managementChannelID) return;

        try {
            let ticket = await getTicket(message, args, text, true);

            ticket.closed = false;

            const ticketChannel = await guild.channels.create(ticket.title, {
                type: 'text',
                parent: settings.ticket.categoryID,
                topic: `${ticket._id} | <#${ticket.project}>`,
            });
            ticket.channel = ticketChannel.id;

            const ticketAuthor = await client.users.fetch(ticket.author);

            let ticketFooter = `ID: ${ticket._id}`;
            if (ticket.edited) ticketFooter += ` | edited at ${new Date(ticket.edited).toLocaleString()}`;

            const ticketEmbed = new MessageEmbed()
                .setAuthor(ticketAuthor.username + '#' + ticketAuthor.discriminator, ticketAuthor.avatarURL() || undefined)
                .setColor('#006fff')
                .setFooter(ticketFooter)
                .addFields([
                    {
                        name: 'Title',
                        value: ticket.title,
                    },
                    {
                        name: 'Project',
                        value: `<#${ticket.project}>`,
                    },
                    {
                        name: 'Description',
                        value: ticket.description,
                    },
                ])
                .setTimestamp(new Date(ticket.timestamp));

            await ticketChannel.send(ticketEmbed);

            const subscriptionChannel = guild.channels.cache.get(settings.ticket.subscriptionChannelID);
            if (!(subscriptionChannel instanceof TextChannel)) return;

            const subscriptionMessage = await subscriptionChannel.send(ticketEmbed);
            ticket.subscriptionMessage = subscriptionMessage.id;

            if (ticket.comments) {
                await Promise.all(
                    ticket.comments.map(async (comment) => {
                        const member = await guild.members.fetch(comment.author);
                        const commentMessage = await ticketChannel.send(
                            new MessageEmbed()
                                .setColor(member.displayHexColor || '#212121')
                                .setAuthor(
                                    member.user.username + '#' + member.user.discriminator,
                                    member.user.avatarURL() || undefined
                                )
                                .setFooter(comment.edited ? `edited at ${new Date(comment.edited).toLocaleString()}` : '')
                                .setTimestamp(new Date(comment.timestamp))
                                .setDescription(comment.content)
                        );

                        comment.message = commentMessage.id;
                        return comment;
                    })
                );
            }

            await ticket.save();
            sendSuccess(message.channel, 'Ticket opened.');
            log(`<@${member.id}> opened the ticket "${ticket.title}".`);
        } catch (error) {
            if (error) sendError(message.channel, error);
        }
    },
};
