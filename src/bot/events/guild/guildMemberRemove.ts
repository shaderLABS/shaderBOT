import { AuditLogEvent, GuildAuditLogsEntry, GuildMember, User } from 'discord.js';
import { Event } from '../../eventHandler.js';
import log from '../../lib/log.js';
import { getGuild, parseUser, sleep } from '../../lib/misc.js';
import { PastPunishment } from '../../lib/punishment.js';

export const event: Event = {
    name: 'guildMemberRemove',
    callback: async (member: GuildMember) => {
        const memberKickTimestamp = Date.now();

        // wait 1 second because discord api sucks
        await sleep(1000);

        const guild = getGuild();
        if (!guild) return;

        const auditLogEntry = (
            await guild.fetchAuditLogs({
                type: AuditLogEvent.MemberKick,
                limit: 5,
            })
        ).entries.find((entry) => entry.target?.id === member.id && entry.executor !== null && !entry.executor.bot && Math.abs(entry.createdTimestamp - memberKickTimestamp) < 5000) as
            | (GuildAuditLogsEntry<AuditLogEvent.MemberKick, 'Delete', 'User'> & { executor: User })
            | undefined;

        if (!auditLogEntry) return;

        try {
            await PastPunishment.createKick(member, auditLogEntry.reason || 'No reason provided.', auditLogEntry.executor.id);
        } catch (error) {
            console.error(error);
            log(`Failed to add kick entry for ${parseUser(member.user)}.`, 'Kick');
        }
    },
};
