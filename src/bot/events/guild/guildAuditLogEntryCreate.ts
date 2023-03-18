import { APIAuditLogChange, AuditLogEvent, Events } from 'discord.js';
import { client } from '../../bot.js';
import { Event } from '../../eventHandler.js';
import { BanAppeal } from '../../lib/banAppeal.js';
import log from '../../lib/log.js';
import { parseUser } from '../../lib/misc.js';
import { PastPunishment, Punishment } from '../../lib/punishment.js';
import { StickyThread } from '../../lib/stickyThread.js';

function parseChangeTimestamp(timestamp: APIAuditLogChange['old_value']) {
    return typeof timestamp === 'string' ? Date.parse(timestamp) : 0;
}

export const event: Event = {
    name: Events.GuildAuditLogEntryCreate,
    callback: async (auditLogEntry) => {
        switch (auditLogEntry.action) {
            case AuditLogEvent.MemberBanAdd:
                if (!auditLogEntry.executorId || !auditLogEntry.targetId || auditLogEntry.executorId === client.user?.id) return;

                try {
                    await Punishment.createBan(auditLogEntry.targetId, auditLogEntry.reason || 'No reason provided.', undefined, auditLogEntry.executorId);
                } catch (error) {
                    console.error(error);
                    log(`Failed to create ban entry for ${parseUser(auditLogEntry.targetId)}.`, 'Permanent Ban');
                }

                break;
            case AuditLogEvent.MemberBanRemove:
                if (!auditLogEntry.executorId || !auditLogEntry.targetId || auditLogEntry.executorId === client.user?.id) return;

                try {
                    const appeal = await BanAppeal.getPendingByUserID(auditLogEntry.targetId).catch(() => undefined);
                    if (appeal) await appeal.close('accepted', 'You have been unbanned.', auditLogEntry.executorId);

                    const punishment = await Punishment.getByUserID(auditLogEntry.targetId, 'ban');
                    await punishment.move(auditLogEntry.executorId);
                } catch (error) {
                    console.error(error);
                    log(`Failed to remove ban entry of ${parseUser(auditLogEntry.targetId)}.`, 'Unban');
                }

                break;
            case AuditLogEvent.MemberKick:
                if (!auditLogEntry.executorId || !auditLogEntry.targetId || auditLogEntry.executorId === client.user?.id) return;

                try {
                    await PastPunishment.createKick(auditLogEntry.targetId, auditLogEntry.reason || 'No reason provided.', auditLogEntry.executorId);
                } catch (error) {
                    console.error(error);
                    log(`Failed to add kick entry for ${parseUser(auditLogEntry.targetId)}.`, 'Kick');
                }

                break;
            case AuditLogEvent.MemberUpdate:
                if (!auditLogEntry.executorId || !auditLogEntry.targetId || auditLogEntry.executorId === client.user?.id) return;

                const timeoutChange = auditLogEntry.changes.find((change) => change.key === 'communication_disabled_until');
                if (!timeoutChange) return;

                const oldTimestamp = parseChangeTimestamp(timeoutChange.old);
                const newTimestamp = parseChangeTimestamp(timeoutChange.new);

                if (oldTimestamp <= auditLogEntry.createdTimestamp && newTimestamp > auditLogEntry.createdTimestamp) {
                    try {
                        await Punishment.createMute(auditLogEntry.targetId, auditLogEntry.reason || 'No reason provided.', (newTimestamp - Date.now()) / 1000, auditLogEntry.executorId);
                    } catch (error) {
                        console.error(error);
                        log(`Failed to create mute entry for ${parseUser(auditLogEntry.targetId)}.`, 'Mute');
                    }
                } else if (oldTimestamp > auditLogEntry.createdTimestamp && newTimestamp <= auditLogEntry.createdTimestamp) {
                    try {
                        const mute = await Punishment.getByUserID(auditLogEntry.targetId, 'mute');
                        await mute?.move(auditLogEntry.executorId);
                    } catch (error) {
                        console.error(error);
                        log(`Failed to remove mute entry of ${parseUser(auditLogEntry.targetId)}.`, 'Unmute');
                    }
                }

                break;
            case AuditLogEvent.ThreadUpdate:
                if (!auditLogEntry.executorId || !auditLogEntry.targetId || auditLogEntry.executorId === client.user?.id) return;

                const archivedChange = auditLogEntry.changes.find((change) => change.key === 'archived');
                if (!archivedChange || archivedChange.old !== false || archivedChange.new !== true) return;

                try {
                    const stickyThread = await StickyThread.getByThreadID(auditLogEntry.targetId);
                    await stickyThread.lift(auditLogEntry.executorId);
                } catch (error) {
                    console.error(error);
                    log(`Failed to lift sticky flag of thread <#${auditLogEntry.targetId}>.`, 'Lift Sticky Flag');
                }

                break;
        }
    },
};
