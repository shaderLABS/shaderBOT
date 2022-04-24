import { GuildMember } from 'discord.js';
import { db } from '../../../db/postgres.js';
import { Event } from '../../eventHandler.js';
import log from '../../lib/log.js';
import { parseUser } from '../../lib/misc.js';
import { ownerOverwrites } from '../../lib/project.js';
import { Punishment } from '../../lib/punishment.js';

export const event: Event = {
    name: 'guildMemberAdd',
    callback: async (member: GuildMember) => {
        const [mute, projects] = await Promise.all([
            Punishment.has(member.id, 'mute'),
            db.query(/*sql*/ `SELECT channel_id FROM project WHERE $1 = ANY (owners) AND role_id IS NOT NULL;`, [member.id]),
        ]);

        if (!mute && member.isCommunicationDisabled()) {
            member.timeout(null);
        }

        for (const project of projects.rows) {
            const channel = member.guild.channels.cache.get(project.channel_id);
            if (!channel?.isText()) {
                log(`Failed to restore permissions for ${parseUser(member.user)}'s project channel <#${project.channel_id}>. The channel does not exist or is not cached.`, 'Restore Permissions');
                continue;
            }

            channel.permissionOverwrites.create(member, ownerOverwrites);
        }
    },
};
