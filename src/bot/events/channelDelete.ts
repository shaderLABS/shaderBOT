import { CategoryChannel, Channel, TextChannel } from 'discord.js';
import { db } from '../../db/postgres.js';
import { settings } from '../bot.js';
import { Event } from '../eventHandler.js';
import { createBackup } from '../lib/backup.js';
import log from '../lib/log.js';
import { getGuild } from '../lib/misc.js';
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
        } else if (channel instanceof TextChannel) {
            if (channel.parentID && settings.ticket.categoryIDs.includes(channel.parentID)) {
                const ticket = (
                    await db.query(
                        /*sql*/ `
                        UPDATE ticket
                        SET closed = TRUE
                        WHERE channel_id = $1 AND closed = FALSE
                        RETURNING subscription_message_id`,
                        [channel.id]
                    )
                ).rows[0];
                if (!ticket) return;

                if (ticket.subscription_message_id) {
                    const guild = getGuild();
                    if (!guild) return;
                    const subscriptionChannel = guild.channels.cache.get(settings.ticket.subscriptionChannelID);
                    if (!(subscriptionChannel instanceof TextChannel)) return;

                    (await subscriptionChannel.messages.fetch(ticket.subscription_message_id)).delete();
                }

                return log(`#${channel.name} has been deleted and the corresponding ticket has been closed.`);
            }

            let logContent = `The channel #${channel.name} has been deleted. `;

            const deletedProject = (await db.query(/*sql*/ `DELETE FROM project WHERE channel_id = $1 RETURNING role_id`, [channel.id])).rows[0];
            if (deletedProject) {
                const role = await channel.guild.roles.fetch(deletedProject.role_id);
                if (role) {
                    role.delete();
                    logContent += 'The role and project that were linked to this channel have been removed. ';
                }
            }

            const backupSize = await createBackup(channel).catch(() => undefined);
            logContent += backupSize ? `${backupSize} cached messages have been encrypted and saved.` : 'There were no cached messages to save.';

            log(logContent);
        }
    },
};
