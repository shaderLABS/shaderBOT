import { ChannelType, Events } from 'discord.js';
import { Event } from '../../eventHandler.js';
import { Project } from '../../lib/project.js';

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

        if (Project.isChannelArchived(newChannel)) {
            const project = await Project.getByChannelID(newChannel.id).catch(() => undefined);
            if (project && !project.archived) project.archive();
        } else {
            const project = await Project.getByChannelID(newChannel.id).catch(() => undefined);
            if (project && project.archived) project.unarchive();
        }
    },
};
