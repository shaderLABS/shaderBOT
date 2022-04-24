import { AuditLogEvent, GuildBan } from 'discord.js';
import { Event } from '../../eventHandler.js';
import log from '../../lib/log.js';
import { parseUser, sleep } from '../../lib/misc.js';
import { Punishment } from '../../lib/punishment.js';

export const event: Event = {
    name: 'guildBanRemove',
    callback: async (ban: GuildBan) => {
        // wait 1 second because discord api sucks
        await sleep(1000);

        const auditLog = (
            await ban.guild.fetchAuditLogs({
                type: AuditLogEvent.MemberBanRemove,
                limit: 1,
            })
        ).entries.first();

        if (!auditLog?.executor || !auditLog.target || auditLog.target.id !== ban.user.id || auditLog.executor.bot) return;
        const { executor } = auditLog;

        try {
            const punishment = await Punishment.getByUserID(ban.user.id, 'ban');
            await punishment.move(executor.id);
        } catch (error) {
            console.error(error);
            log(`Failed to remove ban entry of ${parseUser(ban.user)}.`, 'Unban');
        }
    },
};
