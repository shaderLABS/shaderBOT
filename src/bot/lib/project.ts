import { PermissionOverwriteOptions, Snowflake } from 'discord.js';
import { db } from '../../db/postgres.js';

export const ownerOverwrites: PermissionOverwriteOptions = {
    ManageWebhooks: true,
    ManageThreads: true,
};

export async function isProjectOwner(userID: Snowflake, channelID: Snowflake): Promise<Boolean> {
    return !!(await db.query(/*sql*/ `SELECT 1 FROM project WHERE channel_id = $1 AND $2 = ANY (owners) LIMIT 1`, [channelID, userID])).rows[0];
}

export async function isProject(channelID: Snowflake): Promise<Boolean> {
    return !!(await db.query(/*sql*/ `SELECT 1 FROM project WHERE channel_id = $1;`, [channelID])).rows[0];
}

export async function isProjectArchived(channelID: Snowflake): Promise<Boolean> {
    return !(await db.query(/*sql*/ `SELECT role_id FROM project WHERE channel_id = $1;`, [channelID])).rows[0]?.role_id;
}
