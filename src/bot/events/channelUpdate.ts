import { ChannelType, Events } from 'discord.js';
import { Event } from '../eventHandler.js';
import { Project } from '../lib/project.js';

export const event: Event = {
    name: Events.ChannelUpdate,
    callback: async (oldChannel, newChannel) => {
        if (oldChannel.type !== ChannelType.GuildText || newChannel.type !== ChannelType.GuildText) return;

        if (oldChannel.name !== newChannel.name) {
            /******************
             * RENAME PROJECT *
             ******************/

            const project = await Project.getByChannelID(newChannel.id).catch(() => undefined);
            if (!project || project.archived) return;

            const role = await project.getNotificationRole(newChannel.guild);
            if (role) role.edit({ name: newChannel.name });
        }

        const wasArchived = Project.isChannelArchived(oldChannel);
        const isArchived = Project.isChannelArchived(newChannel);

        if (!wasArchived && isArchived) {
            // archive
            const project = await Project.getByChannelID(newChannel.id).catch(() => undefined);
            if (project) project.archive();
        } else if (wasArchived && !isArchived) {
            // unarchive
            const project = await Project.getByChannelID(newChannel.id).catch(() => undefined);
            if (project) project.unarchive();
        }
    },
};
