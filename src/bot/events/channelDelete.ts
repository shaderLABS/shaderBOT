import { CategoryChannel, Channel } from 'discord.js';
import { db } from '../../db/postgres.js';
import { settings } from '../bot.js';
import { Event } from '../eventHandler.js';
import { createBackup } from '../lib/backup.js';
import log from '../lib/log.js';
import { isTextOrThreadChannel } from '../lib/misc.js';
import { update } from '../settings/settings.js';

export const event: Event = {
    name: 'channelDelete',
    callback: async (channel: Channel) => {
        if (channel instanceof CategoryChannel) {
            const index = settings.ticket.categoryIDs.indexOf(channel.id);
            if (index > -1) {
                settings.ticket.categoryIDs.splice(index, 1);
                update();
            }
        } else if (isTextOrThreadChannel(channel)) {
            if (channel.parentId && settings.ticket.categoryIDs.includes(channel.parentId)) {
                await db.query(
                    /*sql*/ `
                    UPDATE ticket
                    SET closed = TRUE
                    WHERE channel_id = $1 AND closed = FALSE;`,
                    [channel.id]
                );

                return log(`#${channel.name} has been deleted and the corresponding ticket has been closed.`, 'Delete Channel');
            } else {
                let logContent = `The channel #${channel.name} has been deleted. `;

                await db.query(/*sql*/ `UPDATE ticket SET project_channel_id = NULL WHERE project_channel_id = $1;`, [channel.id]);

                const project = (await db.query(/*sql*/ `DELETE FROM project WHERE channel_id = $1 RETURNING role_id`, [channel.id])).rows[0];
                if (project) {
                    const role = await channel.guild.roles.fetch(project.role_id).catch(() => undefined);
                    if (role) role.delete();
                    logContent += 'The project that was linked to this channel has been removed. ';
                }

                const backupSize = await createBackup(channel).catch(() => undefined);
                logContent += backupSize ? `${backupSize} cached messages have been encrypted and saved.` : 'There were no cached messages to save.';

                log(logContent, 'Delete Channel');
            }
        }
    },
};
