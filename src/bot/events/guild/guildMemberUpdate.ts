import { GuildMember } from 'discord.js';
import { Event } from '../../eventHandler.js';
import { sleep } from '../../lib/misc.js';
import { mute, unmute } from '../../lib/muteUser.js';

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
                type: 'MEMBER_UPDATE',
                limit: 1,
            })
        ).entries.first();

        if (!auditLog || !auditLog.executor || !auditLog.target || auditLog.target.id !== newMember.id || auditLog.executor.bot) return;

        if (wasCommunicationDisabled) {
            // manual unmute
            unmute(newMember.id, auditLog.executor.id);
        } else if (isCommunicationDisabled) {
            // manual mute
            mute(newMember.id, (newMember.communicationDisabledUntilTimestamp - auditLog.createdAt.getTime()) / 1000, auditLog.executor.id, auditLog.reason || 'No reason provided.');
        }
    },
};
