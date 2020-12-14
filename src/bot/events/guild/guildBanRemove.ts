import { Guild, User } from 'discord.js';
import { db } from '../../../db/postgres.js';
import { Event } from '../../eventHandler.js';
import log from '../../lib/log.js';
import { store } from '../../lib/punishments.js';

export const event: Event = {
    name: 'guildBanRemove',
    callback: async (guild: Guild, user: User) => {
        // wait 1 second because discord api sucks
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const auditLog = (
            await guild.fetchAuditLogs({
                type: 'MEMBER_BAN_REMOVE',
                limit: 1,
            })
        ).entries.first();

        if (!auditLog || !(auditLog.target instanceof User) || auditLog.target.id !== user.id || auditLog.executor.bot) return;
        const { createdAt, executor } = auditLog;

        try {
            await db.query(
                /*sql*/ `
                    WITH moved_rows AS (
                        DELETE FROM punishment 
                        WHERE "type" = 'ban' AND user_id = $1
                        RETURNING id, user_id, type, mod_id, reason, timestamp
                    )
                    INSERT INTO past_punishment
                    SELECT DISTINCT *, $2::NUMERIC AS lifted_mod_id, $3::TIMESTAMP AS lifted_timestamp FROM moved_rows;`,
                [user.id, executor.id, createdAt]
            );
        } catch (error) {
            console.error(error);
            log(`Failed to remove ban entry of <@${user.id}>: an error occurred while accessing the database.`);
        }

        const timeout = store.tempbans.get(user.id);
        if (timeout) {
            clearTimeout(timeout);
            store.tempbans.delete(user.id);
        }

        log(`<@${executor.id}> unbanned <@${user.id}>.`, 'Unban');
    },
};
