import { APIOverwrite, APIRole, AuditLogEvent, GuildAuditLogsEntry, GuildMember, User } from 'discord.js';
import { Event } from '../../eventHandler.js';
import { sleep } from '../../lib/misc.js';
import { Punishment } from '../../lib/punishment.js';

function parseChangeTimestamp(timestamp: string | number | boolean | APIRole[] | APIOverwrite[] | undefined) {
    return typeof timestamp === 'string' ? Date.parse(timestamp) : 0;
}

export const event: Event = {
    name: 'guildMemberUpdate',
    callback: async (oldMember: GuildMember, newMember: GuildMember) => {
        const wasCommunicationDisabled = oldMember.isCommunicationDisabled();
        const isCommunicationDisabled = newMember.isCommunicationDisabled();

        if ((!wasCommunicationDisabled && !isCommunicationDisabled) || (wasCommunicationDisabled && isCommunicationDisabled)) return;

        const memberUpdateTimestamp = Date.now();

        // wait 1 second because discord api sucks
        await sleep(1000);

        const auditLogEntries = (
            await newMember.guild.fetchAuditLogs({
                type: AuditLogEvent.MemberUpdate,
                limit: 5,
            })
        ).entries;

        if (wasCommunicationDisabled) {
            const auditLogEntry = auditLogEntries.find(
                (entry) =>
                    entry.target?.id === newMember.id &&
                    entry.executor !== null &&
                    !entry.executor.bot &&
                    entry.changes.some(
                        (change) =>
                            change.key === 'communication_disabled_until' && parseChangeTimestamp(change.old) > memberUpdateTimestamp && parseChangeTimestamp(change.new) <= memberUpdateTimestamp
                    ) &&
                    Math.abs(entry.createdTimestamp - memberUpdateTimestamp) < 5000
            ) as (GuildAuditLogsEntry<AuditLogEvent.MemberUpdate, 'Update', 'User'> & { executor: User }) | undefined;

            if (!auditLogEntry) return;

            // manual unmute
            const mute = await Punishment.getByUserID(newMember.id, 'mute').catch(() => undefined);
            mute?.move(auditLogEntry.executor.id);
        } else if (isCommunicationDisabled) {
            const auditLogEntry = auditLogEntries.find(
                (entry) =>
                    entry.target?.id === newMember.id &&
                    entry.executor !== null &&
                    !entry.executor.bot &&
                    entry.changes.some(
                        (change) =>
                            change.key === 'communication_disabled_until' && parseChangeTimestamp(change.old) <= memberUpdateTimestamp && parseChangeTimestamp(change.new) > memberUpdateTimestamp
                    ) &&
                    Math.abs(entry.createdTimestamp - memberUpdateTimestamp) < 5000
            ) as (GuildAuditLogsEntry<AuditLogEvent.MemberUpdate, 'Update', 'User'> & { executor: User }) | undefined;

            if (!auditLogEntry) return;

            // manual mute
            Punishment.createMute(
                newMember,
                auditLogEntry.reason || 'No reason provided.',
                (newMember.communicationDisabledUntilTimestamp - auditLogEntry.createdAt.getTime()) / 1000,
                auditLogEntry.executor.id
            );
        }
    },
};
