import { AuditLogEvent, Events } from 'discord.js';
import { setTimeout as sleep } from 'node:timers/promises';
import { Event } from '../../eventHandler.js';
import log from '../../lib/log.js';
import { NonNullableProperty, parseUser } from '../../lib/misc.js';
import { Punishment } from '../../lib/punishment.js';

export const event: Event = {
    name: Events.GuildBanAdd,
    callback: async (ban) => {
        const banCreateTimestamp = Date.now();

        // wait 1 second because discord api sucks
        await sleep(1000);

        const auditLogEntry = (
            await ban.guild.fetchAuditLogs({
                type: AuditLogEvent.MemberBanAdd,
                limit: 5,
            })
        ).entries.find(
            (entry): entry is NonNullableProperty<typeof entry, 'executor'> =>
                entry.target?.id === ban.user.id && entry.executor !== null && !entry.executor.bot && Math.abs(entry.createdTimestamp - banCreateTimestamp) < 5000
        );

        if (!auditLogEntry) return;

        try {
            await Punishment.createBan(ban.user, auditLogEntry.reason || 'No reason provided.', undefined, auditLogEntry.executor.id);
        } catch (error) {
            console.error(error);
            log(`Failed to create ban entry for ${parseUser(ban.user)}.`, 'Permanent Ban');
        }
    },
};
