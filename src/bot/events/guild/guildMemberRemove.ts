import { AuditLogEvent, Events } from 'discord.js';
import { setTimeout as sleep } from 'node:timers/promises';
import { Event } from '../../eventHandler.js';
import log from '../../lib/log.js';
import { getGuild, NonNullableProperty, parseUser } from '../../lib/misc.js';
import { PastPunishment } from '../../lib/punishment.js';

export const event: Event = {
    name: Events.GuildMemberRemove,
    callback: async (member) => {
        const memberKickTimestamp = Date.now();

        // wait 1 second because discord api sucks
        await sleep(1000);

        const guild = getGuild();

        const auditLogEntry = (
            await guild.fetchAuditLogs({
                type: AuditLogEvent.MemberKick,
                limit: 5,
            })
        ).entries.find(
            (entry): entry is NonNullableProperty<typeof entry, 'executor'> =>
                entry.target?.id === member.id && entry.executor !== null && !entry.executor.bot && Math.abs(entry.createdTimestamp - memberKickTimestamp) < 5000
        );

        if (!auditLogEntry) return;

        try {
            await PastPunishment.createKick(member.id, auditLogEntry.reason || 'No reason provided.', auditLogEntry.executor.id);
        } catch (error) {
            console.error(error);
            log(`Failed to add kick entry for ${parseUser(member.user)}.`, 'Kick');
        }
    },
};
