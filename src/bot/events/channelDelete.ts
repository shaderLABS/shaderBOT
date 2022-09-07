import { ChannelType, Events } from 'discord.js';
import { db } from '../../db/postgres.js';
import { Event } from '../eventHandler.js';
import { Backup } from '../lib/backup.js';
import { LockSlowmode } from '../lib/lockSlowmode.js';
import log from '../lib/log.js';

export const event: Event = {
    name: Events.ChannelDelete,
    callback: async (channel) => {
        if (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildVoice && !channel.isThread()) return;

        let logContent = `The channel #${channel.name} has been deleted. `;

        const project = (await db.query(/*sql*/ `DELETE FROM project WHERE channel_id = $1 RETURNING role_id`, [channel.id])).rows[0];
        if (project && project.role_id) {
            const role = await channel.guild.roles.fetch(project.role_id).catch(() => undefined);
            if (role) role.delete();
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
