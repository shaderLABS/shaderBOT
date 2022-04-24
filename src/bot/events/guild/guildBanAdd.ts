import { AuditLogEvent, GuildBan } from 'discord.js';
import { client } from '../../bot.js';
import { Event } from '../../eventHandler.js';
import log from '../../lib/log.js';
import { parseUser, sleep } from '../../lib/misc.js';
import { Punishment } from '../../lib/punishment.js';

export const event: Event = {
    name: 'guildBanAdd',
    callback: async (ban: GuildBan) => {
        // wait 1 second because discord api sucks
        await sleep(1000);

        const auditLog = (
            await ban.guild.fetchAuditLogs({
                type: AuditLogEvent.MemberBanAdd,
                limit: 1,
            })
        ).entries.first();

        if (!auditLog?.executor || (client.user && auditLog?.executor.id === client.user.id)) return;
        if (!auditLog || !auditLog.target || auditLog.target.id !== ban.user.id || auditLog.executor.bot) {
            return log(
                `Someone banned ${parseUser(ban.user)}, but the moderator could not be retrieved. Please check the audit logs, ban ${parseUser(
                    ban.user.id
                )} again using the command and refrain from banning people using other bots or the Discord feature!`,
                'Ban'
            );
        }

        const { executor } = auditLog;
        const reason = auditLog.reason || 'No reason provided.';

        try {
            await Punishment.createBan(ban.user, reason, undefined, executor.id);
        } catch (error) {
            console.error(error);
            log(`Failed to create ban entry for ${parseUser(ban.user)}.`, 'Permanent Ban');
        }
    },
};
