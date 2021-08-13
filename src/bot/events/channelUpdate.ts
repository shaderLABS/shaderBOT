import { Channel, Snowflake, TextChannel } from 'discord.js';
import { db } from '../../db/postgres.js';
import { client, settings } from '../bot.js';
import { Event } from '../eventHandler.js';
import log from '../lib/log.js';
import { ownerOverwrites } from '../lib/project.js';

export const event: Event = {
    name: 'channelUpdate',
    callback: async (oldChannel: Channel, newChannel: Channel) => {
        if (!(oldChannel instanceof TextChannel) || !(newChannel instanceof TextChannel) || !oldChannel.parentId || !newChannel.parentId || settings.ticket.categoryIDs.includes(newChannel.parentId))
            return;

        if (oldChannel.name !== newChannel.name) {
            /******************
             * RENAME PROJECT *
             ******************/

            const projectRole = (await db.query(/*sql*/ `SELECT role_id FROM project WHERE channel_id = $1;`, [newChannel.id])).rows[0];
            if (!projectRole) return;

            try {
                const role = await newChannel.guild.roles.fetch(projectRole.role_id);
                if (!role?.editable) throw new Error();
                await role.edit({ name: newChannel.name });
            } catch {
                log(`The name of <#${newChannel.id}> has been updated, but the role could not be renamed.`, 'Edit Channel Name');
            }
        }

        if (!oldChannel.permissionOverwrites.cache.equals(newChannel.permissionOverwrites.cache)) {
            /**********************
             * UPDATE PERMISSIONS *
             **********************/

            const tickets = await db.query(/*sql*/ `SELECT channel_id::TEXT FROM ticket WHERE closed = false AND project_channel_id = $1;`, [newChannel.id]);

            for (const ticket of tickets.rows) {
                if (!ticket.channel_id) continue;

                const ticketChannel = newChannel.guild.channels.cache.get(ticket.channel_id);
                if (ticketChannel instanceof TextChannel) ticketChannel.permissionOverwrites.set(newChannel.permissionOverwrites.cache);
            }
        }

        if (!settings.archiveCategoryIDs.includes(oldChannel.parentId) && settings.archiveCategoryIDs.includes(newChannel.parentId)) {
            /***********
             * ARCHIVE *
             ***********/

            const project = (await db.query(/*sql*/ `SELECT role_id FROM project WHERE channel_id = $1;`, [newChannel.id])).rows[0];

            try {
                if (project) {
                    const role = await newChannel.guild.roles.fetch(project.role_id);
                    if (!role?.editable) throw new Error();
                    await role.delete();
                }

                newChannel.lockPermissions();

                log(`<#${newChannel.id}> has been archived.`, 'Archive Project');
            } catch {
                log(`<#${newChannel.id}> has been archived, but the notification role could not be deleted.`, 'Archive Project');
            }
        } else if (settings.archiveCategoryIDs.includes(oldChannel.parentId) && !settings.archiveCategoryIDs.includes(newChannel.parentId)) {
            /*************
             * UNARCHIVE *
             *************/

            const project = (await db.query(/*sql*/ `SELECT owners::TEXT[] FROM project WHERE channel_id = $1;`, [newChannel.id])).rows[0];

            try {
                if (project) {
                    project.owners.forEach(async (ownerID: Snowflake) => {
                        const owner = await client.users.fetch(ownerID).catch(() => undefined);
                        if (owner) newChannel.permissionOverwrites.create(owner, ownerOverwrites);
                    });

                    const role = await newChannel.guild.roles.create({
                        name: `${newChannel.name}`,
                        mentionable: false,
                        reason: `Create notification role for #${newChannel.name}.`,
                    });

                    db.query(/*sql*/ `UPDATE project SET role_id = $1 WHERE channel_id = $2;`, [role.id, newChannel.id]);
                }

                log(`<#${newChannel.id}> has been unarchived.`, 'Unarchive Project');
            } catch {
                log(`<#${newChannel.id}> has been unarchived, but the notification role could not be created.`, 'Unarchive Project');
            }
        }
    },
};
