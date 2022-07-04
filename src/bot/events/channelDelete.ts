import { Channel, ChannelType } from 'discord.js';
import { db } from '../../db/postgres.js';
import { Event } from '../eventHandler.js';
import { createBackup } from '../lib/backup.js';
import log from '../lib/log.js';

export const event: Event = {
    name: 'channelDelete',
    callback: async (channel: Channel) => {
        if (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildVoice && !channel.isThread()) return;

        let logContent = `The channel #${channel.name} has been deleted. `;

        const project = (await db.query(/*sql*/ `DELETE FROM project WHERE channel_id = $1 RETURNING role_id`, [channel.id])).rows[0];
        if (project && project.role_id) {
            const role = await channel.guild.roles.fetch(project.role_id).catch(() => undefined);
            if (role) role.delete();
            logContent += 'The project that was linked to this channel has been removed. ';
        }

        const backupSize = await createBackup(channel).catch(() => undefined);
        logContent += backupSize ? `${backupSize} cached messages have been encrypted and saved.` : 'There were no cached messages to save.';

        log(logContent, 'Delete Channel');
    },
};
