import { AuditLogEvent, GuildMember } from 'discord.js';
import { Event } from '../../eventHandler.js';
import { sleep } from '../../lib/misc.js';
import { Punishment } from '../../lib/punishment.js';

export const event: Event = {
    name: 'guildMemberUpdate',
    callback: async (oldMember: GuildMember, newMember: GuildMember) => {
        const wasCommunicationDisabled = oldMember.isCommunicationDisabled();
        const isCommunicationDisabled = newMember.isCommunicationDisabled();

        if ((!wasCommunicationDisabled && !isCommunicationDisabled) || (wasCommunicationDisabled && isCommunicationDisabled)) return;

        // wait 1 second because discord api sucks
        await sleep(1000);

        const auditLog = (
            await newMember.guild.fetchAuditLogs({
                type: AuditLogEvent.MemberUpdate,
                limit: 1,
            })
        ).entries.first();

        if (!auditLog || !auditLog.executor || !auditLog.target || auditLog.target.id !== newMember.id || auditLog.executor.bot) return;

        if (wasCommunicationDisabled) {
            // manual unmute
            const mute = await Punishment.getByUserID(newMember.id, 'mute').catch(() => undefined);
            mute?.move(auditLog.executor.id);
        } else if (isCommunicationDisabled) {
            // manual mute
            Punishment.createMute(newMember, auditLog.reason || 'No reason provided.', (newMember.communicationDisabledUntilTimestamp - auditLog.createdAt.getTime()) / 1000, auditLog.executor.id);
        }
    },
};
