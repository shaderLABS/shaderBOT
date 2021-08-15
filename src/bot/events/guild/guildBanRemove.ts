import { Guild, User } from 'discord.js';
import { db } from '../../../db/postgres.js';
import { Event } from '../../eventHandler.js';
import log from '../../lib/log.js';
import { parseUser, sleep } from '../../lib/misc.js';
import { store } from '../../lib/punishments.js';

export const event: Event = {
    name: 'guildBanRemove',
    callback: async (guild: Guild, user: User) => {
        // wait 1 second because discord api sucks
        await sleep(1000);

        const auditLog = (
            await guild.fetchAuditLogs({
                type: 'MEMBER_BAN_REMOVE',
                limit: 1,
            })
        ).entries.first();

        if (!auditLog?.executor || !(auditLog.target instanceof User) || auditLog.target.id !== user.id || auditLog.executor.bot) return;
        const { createdAt, executor } = auditLog;

        try {
            await db.query(
                /*sql*/ `
                WITH moved_rows AS (
                    DELETE FROM punishment
                    WHERE "type" = 'ban' AND user_id = $1
                    RETURNING id, user_id, type, mod_id, reason, context_url, edited_timestamp, edited_mod_id, timestamp
                )
                INSERT INTO past_punishment (id, user_id, type, mod_id, reason, context_url, edited_timestamp, edited_mod_id, lifted_timestamp, lifted_mod_id, timestamp)
                SELECT id, user_id, type, mod_id, reason, context_url, edited_timestamp, edited_mod_id, $2::TIMESTAMP AS lifted_timestamp, $3::NUMERIC AS lifted_mod_id, timestamp FROM moved_rows;`,
                [user.id, createdAt, executor.id]
            );
        } catch (error) {
            console.error(error);
            log(`Failed to remove ban entry of ${parseUser(user)}: an error occurred while accessing the database.`, 'Unban');
        }

        const timeout = store.tempbans.get(user.id);
        if (timeout) {
            clearTimeout(timeout);
            store.tempbans.delete(user.id);
        }

        log(`${parseUser(executor)} unbanned ${parseUser(user)}.`, 'Unban');
    },
};
