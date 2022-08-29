import { AuditLogEvent, Events, ThreadAutoArchiveDuration } from 'discord.js';
import { setTimeout as sleep } from 'node:timers/promises';
import { Event } from '../../eventHandler.js';
import log from '../../lib/log.js';
import { StickyThread } from '../../lib/stickyThread.js';

export const event: Event = {
    name: Events.ThreadUpdate,
    callback: async (oldThread, newThread) => {
        if (oldThread.archived || !newThread.archived) return;

        const { guild } = newThread;
        let threadArchiveTimestamp = newThread.archiveTimestamp || Date.now();

        const stickyThread = await StickyThread.getByThreadID(newThread.id).catch(() => undefined);
        if (!stickyThread) return;

        // wait 1 second because discord api sucks
        await sleep(1000);

        const auditLogEntry = (
            await guild.fetchAuditLogs({
                type: AuditLogEvent.ThreadUpdate,
                limit: 5,
            })
        ).entries.find(
            (entry) =>
                entry.target?.id === newThread.id &&
                entry.executor !== null &&
                !entry.executor.bot &&
                entry.changes.some((change) => change.key === 'archived' && change.old === false && change.new === true) &&
                Math.abs(entry.createdTimestamp - threadArchiveTimestamp) < 5000
        );

        if (auditLogEntry) {
            // manual -> lift
            stickyThread.lift(auditLogEntry.executor?.id);
        } else {
            // automatic -> unarchive
            try {
                newThread.edit({
                    archived: false,
                    autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
                    reason: 'Sticky Thread',
                });
            } catch {
                log(`Failed to unarchive the sticky thread <#${newThread.id}>.`, 'Sticky Thread');
            }
        }
    },
};
