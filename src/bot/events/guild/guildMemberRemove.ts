import { GuildMember, User } from 'discord.js';
import { db } from '../../../db/postgres.js';
import { Event } from '../../eventHandler.js';
import log from '../../lib/log.js';
import { getGuild, parseUser, sleep } from '../../lib/misc.js';

export const event: Event = {
    name: 'guildMemberRemove',
    callback: async (member: GuildMember) => {
        // wait 1 second because discord api sucks
        await sleep(1000);

        const guild = member.partial ? getGuild() : member.guild;
        if (!guild) return;

        const auditLog = (
            await guild.fetchAuditLogs({
                type: 'MEMBER_KICK',
                limit: 1,
            })
        ).entries.first();

        if (!auditLog?.executor || !(auditLog.target instanceof User) || auditLog.target.id !== member.id || auditLog.executor.bot) return;
        const { createdAt, executor, reason } = auditLog;

        try {
            await db.query(
                /*sql*/ `
                INSERT INTO past_punishment (user_id, "type", mod_id, reason, timestamp)
                VALUES ($1, 'kick', $2, $3, $4)
                RETURNING id;`,
                [member.id, executor.id, reason, createdAt]
            );
        } catch (error) {
            console.error(error);
            log(`Failed to add kick entry for ${parseUser(member.user)}: an error occurred while accessing the database.`, 'Kick');
        }

        log(`${parseUser(executor)} kicked ${parseUser(member.user)}:\n\`${reason || 'No reason provided.'}\``, 'Kick');
    },
};
