import { Event } from '../eventHandler.js';
import { Channel, TextChannel } from 'discord.js';
import axios from 'axios';
import log from '../lib/log.js';
import Project from '../../db/models/Project.js';
import { settings, client } from '../bot.js';
import Ticket from '../../db/models/Ticket.js';

export const event: Event = {
    name: 'channelDelete',
    callback: async (channel: Channel) => {
        if (!(channel instanceof TextChannel)) return;

        if (channel.parentID === settings.ticket.categoryID) {
            const ticket = await Ticket.findOne({ channel: channel.id });
            if (!ticket) return;

            ticket.closed = true;

            if (ticket.subscriptionMessage) {
                const guild = client.guilds.cache.first();
                if (!guild) return;
                const subscriptionChannel = guild.channels.cache.get(settings.ticket.subscriptionChannelID);
                if (!(subscriptionChannel instanceof TextChannel)) return;

                (await subscriptionChannel.messages.fetch(ticket.subscriptionMessage)).delete();
                ticket.subscriptionMessage = '';
            }

            await ticket.save();

            return log(`#${channel.name} has been deleted and the corresponding ticket has been closed.`);
        }

        const messages = channel.messages.cache;

        let content = '';
        messages.each((message) => {
            content += `${message.author.username}#${message.author.discriminator}: ${message.content}\n`;
        });

        let projectLog = '';
        const deleteProject = await Project.findOne({ channel: channel.id });
        if (deleteProject) {
            const role = await channel.guild.roles.fetch(deleteProject.pingRole);
            deleteProject.deleteOne();
            if (role) {
                role.delete();
                projectLog = 'The role and project that were linked to this channel have been removed.';
            }
        }

        if (content === '') return log(`The channel #${channel.name} has been deleted. There were no cached messages to upload. ${projectLog}`);

        const res = await axios.post('https://hastebin.com/documents', `CACHED MESSAGES OF #${channel.name}\n\n${content}`);

        log(`The channel #${channel.name} has been deleted. [${messages.size} cached messages](https://www.hastebin.com/${res.data.key}) have been uploaded. ${projectLog}`);
    },
};
