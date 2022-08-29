import { AuditLogEvent, Events } from 'discord.js';
import { setTimeout as sleep } from 'node:timers/promises';
import { Event } from '../../eventHandler.js';
import { BanAppeal } from '../../lib/banAppeal.js';
import log from '../../lib/log.js';
import { NonNullableProperty, parseUser } from '../../lib/misc.js';
import { Punishment } from '../../lib/punishment.js';

export const event: Event = {
    name: Events.GuildBanRemove,
    callback: async (ban) => {
        const banDeleteTimestamp = Date.now();

        // wait 1 second because discord api sucks
        await sleep(1000);

        const auditLogEntry = (
            await ban.guild.fetchAuditLogs({
                type: AuditLogEvent.MemberBanRemove,
                limit: 5,
            })
        ).entries.find(
            (entry): entry is NonNullableProperty<typeof entry, 'executor'> =>
                entry.target?.id === ban.user.id && entry.executor !== null && !entry.executor.bot && Math.abs(entry.createdTimestamp - banDeleteTimestamp) < 5000
        );

        if (!auditLogEntry) return;

        try {
            const appeal = await BanAppeal.getPendingByUserID(ban.user.id).catch(() => undefined);
            if (appeal) await appeal.close('accepted', 'You have been unbanned.', auditLogEntry.executor.id);

            const punishment = await Punishment.getByUserID(ban.user.id, 'ban');
            await punishment.move(auditLogEntry.executor.id);
        } catch (error) {
            console.error(error);
            log(`Failed to remove ban entry of ${parseUser(ban.user)}.`, 'Unban');
        }
    },
};
