import { AuditLogEvent, Events, ThreadAutoArchiveDuration } from 'discord.js';
import { setTimeout as sleep } from 'node:timers/promises';
import { Event } from '../../eventHandler.js';
import log from '../../lib/log.js';
import { StickyThread } from '../../lib/stickyThread.js';

export const event: Event = {
    name: Events.ThreadUpdate,
    callback: async (oldThread, newThread) => {
        if (oldThread.archived || !newThread.archived) return;

        const threadArchiveTimestamp = newThread.archiveTimestamp || Date.now();

        const stickyThread = await StickyThread.getByThreadID(newThread.id).catch(() => undefined);
        if (!stickyThread) return;

        // wait 1 second for the audit log entry to be created
        await sleep(1000);

        const auditLogEntry = (
            await newThread.guild.fetchAuditLogs({
                type: AuditLogEvent.ThreadUpdate,
                limit: 5,
            })
        ).entries.find((entry) => {
            if (entry.targetId !== newThread.id || entry.executor === null || entry.executor.bot || Math.abs(entry.createdTimestamp - threadArchiveTimestamp) > 5000) return false;

            const archivedChange = entry.changes.find((change) => change.key === 'archived');
            if (!archivedChange || archivedChange.old !== false || archivedChange.new !== true) return false;

            return true;
        });

        if (auditLogEntry) return;
        // archive was automatic -> unarchive

        try {
            newThread.edit({
                archived: false,
                autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
                reason: 'Sticky Thread',
            });
        } catch {
            log(`Failed to unarchive the sticky thread <#${newThread.id}>.`, 'Sticky Thread');
        }
    },
};
