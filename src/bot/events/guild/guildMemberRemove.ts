import { AuditLogEvent, GuildMember } from 'discord.js';
import { Event } from '../../eventHandler.js';
import log from '../../lib/log.js';
import { getGuild, parseUser, sleep } from '../../lib/misc.js';
import { PastPunishment } from '../../lib/punishment.js';

export const event: Event = {
    name: 'guildMemberRemove',
    callback: async (member: GuildMember) => {
        // wait 1 second because discord api sucks
        await sleep(1000);

        const guild = member.partial ? getGuild() : member.guild;
        if (!guild) return;

        const auditLog = (
            await guild.fetchAuditLogs({
                type: AuditLogEvent.MemberKick,
                limit: 1,
            })
        ).entries.first();

        if (!auditLog?.executor || !auditLog.target || auditLog.target.id !== member.id || auditLog.executor.bot) return;
        const { executor } = auditLog;
        const reason = auditLog.reason || 'No reason provided.';

        try {
            await PastPunishment.createKick(member, reason, executor.id);
        } catch (error) {
            console.error(error);
            log(`Failed to add kick entry for ${parseUser(member.user)}.`, 'Kick');
        }
    },
};
