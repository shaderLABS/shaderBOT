import { ChannelType, Events } from 'discord.js';
import { Event } from '../eventHandler.js';
import { Backup } from '../lib/backup.js';
import { LockSlowmode } from '../lib/lockSlowmode.js';
import log from '../lib/log.js';
import { Project } from '../lib/project.js';

export const event: Event = {
    name: Events.ChannelDelete,
    callback: async (channel) => {
        if (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildVoice && !channel.isThread()) return;

        let logContent = `The channel #${channel.name} has been deleted. `;

        const project = await Project.getByChannelID(channel.id).catch(() => undefined);
        if (project) {
            project.deleteEntry();
            logContent += 'The project that was linked to this channel has been removed. ';
        }

        const backup = await Backup.create(channel).catch(() => undefined);
        logContent += backup ? `${backup.size} cached messages have been encrypted and saved. ` : 'There were no cached messages to save. ';

        const lockSlowmodes = await LockSlowmode.getAllByChannelID(channel.id);
        if (lockSlowmodes.length > 0) {
            lockSlowmodes.forEach((lockSlowmode) => lockSlowmode.delete());
            logContent += 'The existing locks and slowmodes have been deleted. ';
        }

        log(logContent, 'Delete Channel');
    },
};
