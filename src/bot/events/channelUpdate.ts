import { Channel, TextChannel } from 'discord.js';
import { db } from '../../db/postgres.js';
import { settings } from '../bot.js';
import { Event } from '../eventHandler.js';
import log from '../lib/log.js';

export const event: Event = {
    name: 'channelUpdate',
    callback: async (oldChannel: Channel, newChannel: Channel) => {
        if (
            !(oldChannel instanceof TextChannel) ||
            !(newChannel instanceof TextChannel) ||
            oldChannel.name === newChannel.name ||
            (newChannel.parentID && settings.ticket.categoryIDs.includes(newChannel.parentID))
        )
            return;

        const projectRole = (await db.query(/*sql*/ `SELECT role_id FROM project WHERE channel_id = $1;`, [newChannel.id])).rows[0];
        if (!projectRole) return;

        try {
            const role = await newChannel.guild.roles.fetch(projectRole.role_id);
            if (!role) throw new Error();
            role.edit({ name: newChannel.name });
        } catch {
            log(`The name of <#${newChannel.id}> has been updated, but the role could not be renamed.`);
        }
    },
};
