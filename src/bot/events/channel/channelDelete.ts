import { ChannelType, Events } from 'discord.js';
import type { Event } from '../../eventHandler.ts';
import { Backup } from '../../lib/backup.ts';
import { ChannelLock } from '../../lib/channelRestriction/lock.ts';
import { ChannelSlowmode } from '../../lib/channelRestriction/slowmode.ts';
import log from '../../lib/log.ts';
import { Project } from '../../lib/project.ts';

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

        const channelLock = await ChannelLock.getByChannelID(channel.id).catch(() => undefined);
        if (channelLock) {
            channelLock.delete();
            logContent += 'The existing lock has been deleted. ';
        }

        const channelSlowmode = await ChannelSlowmode.getByChannelID(channel.id).catch(() => undefined);
        if (channelSlowmode) {
            channelSlowmode.delete();
            logContent += 'The existing slowmode has been deleted. ';
        }

        log(logContent, 'Delete Channel');
    },
};
