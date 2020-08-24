import { Command } from '../../commandHandler.js';
import { Message, MessageEmbed, TextChannel } from 'discord.js';
import { settings, client } from '../../bot.js';
import { getTicketMod } from '../../../misc/searchMessage.js';

export const command: Command = {
    commands: ['open'],
    expectedArgs: '<ticketID|ticketTitle>',
    minArgs: 1,
    maxArgs: null,
    requiredPermissions: ['MANAGE_MESSAGES'],
    superCommand: 'modticket',
    callback: async (message: Message, args: string[], text: string) => {
        const { guild, member } = message;
        if (!guild || !member) return;

        try {
            let ticket = await getTicketMod(message, args, text, true);

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
                .setColor('#0000ff')
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
                        const author = await client.users.fetch(comment.author);
                        const commentMessage = await ticketChannel.send(
                            new MessageEmbed()
                                .setAuthor(author.username + '#' + author.discriminator, author.avatarURL() || undefined)
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
            message.channel.send('Ticket opened.');
        } catch (error) {
            if (error) message.channel.send(error);
        }
    },
};
