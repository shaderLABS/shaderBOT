import { PermissionOverwriteOptions, Snowflake } from 'discord.js';
import { db } from '../../db/postgres.js';

export const ownerOverwrites: PermissionOverwriteOptions = {
    MANAGE_WEBHOOKS: true,
    MANAGE_THREADS: true,
};

export async function isProjectOwner(userID: Snowflake, channelID: Snowflake): Promise<Boolean> {
    return !!(await db.query(/*sql*/ `SELECT 1 FROM project WHERE channel_id = $1 AND $2 = ANY (owners) LIMIT 1`, [channelID, userID])).rows[0];
}

export async function isProject(channelID: Snowflake): Promise<Boolean> {
    return !!(await db.query(/*sql*/ `SELECT 1 FROM project WHERE channel_id = $1;`, [channelID])).rows[0];
}
