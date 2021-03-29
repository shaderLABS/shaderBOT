import { Guild, User } from 'discord.js';
import { db } from '../../../db/postgres.js';
import { client } from '../../bot.js';
import { Event } from '../../eventHandler.js';
import { punishmentToString } from '../../lib/banUser.js';
import log from '../../lib/log.js';
import { sleep } from '../../lib/misc.js';
import { store } from '../../lib/punishments.js';

export const event: Event = {
    name: 'guildBanAdd',
    callback: async (guild: Guild, user: User) => {
        // wait 1 second because discord api sucks
        await sleep(1000);

        const auditLog = (
            await guild.fetchAuditLogs({
                type: 'MEMBER_BAN_ADD',
                limit: 1,
            })
        ).entries.first();

        if (client.user && auditLog?.executor.id === client.user?.id) return;
        if (!auditLog || !(auditLog.target instanceof User) || auditLog.target.id !== user.id || auditLog.executor.bot)
            return log(
                `Someone banned <@${user.id}>, but the moderator could not be retrieved. Please check the audit logs, ban <@${user.id}> again using the command and refrain from banning people using other bots or the Discord feature!`
            );

        const { createdAt, executor, reason } = auditLog;

        try {
            const overwrittenPunishment = (
                await db.query(
                    /*sql*/ `
                    WITH moved_rows AS (
                        DELETE FROM punishment
                        WHERE "type" = 'ban' AND user_id = $1
                        RETURNING id, user_id, type, mod_id, reason, edited_timestamp, edited_mod_id, expire_timestamp, timestamp
                    ), inserted_rows AS (
                        INSERT INTO past_punishment
                        SELECT id, user_id, type, mod_id, reason, edited_timestamp, edited_mod_id, $2::TIMESTAMP AS lifted_timestamp, $3::NUMERIC AS lifted_mod_id, timestamp FROM moved_rows
                    )
                    SELECT * FROM moved_rows;`,
                    [user.id, createdAt, executor.id]
                )
            ).rows[0];

            if (overwrittenPunishment) {
                const timeout = store.tempbans.get(user.id);
                if (timeout) {
                    clearTimeout(timeout);
                    store.tempbans.delete(user.id);
                }
            }

            await db.query(
                /*sql*/ `
                INSERT INTO punishment (user_id, "type", mod_id, reason, timestamp)
                VALUES ($1, 'ban', $2, $3, $4)
                RETURNING id;`,
                [user.id, executor.id, reason, createdAt]
            );

            log(
                `<@${executor.id}> permanently banned <@${user.id}>:\n\`${reason || 'No reason provided.'}\`${
                    overwrittenPunishment ? `\n\n<@${user.id}>'s previous ban has been overwritten:\n ${punishmentToString(overwrittenPunishment)}` : ''
                }`,
                'Ban'
            );
        } catch (error) {
            console.error(error);
            log(`Failed to create ban entry for <@${user.id}>.`);
        }
    },
};
