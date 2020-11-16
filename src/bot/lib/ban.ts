import { User } from 'discord.js';
import { db } from '../../db/postgres.js';
import { client } from '../bot.js';
import { store } from './punishments.js';
import log from './log.js';

export async function tempban(user: User, duration: number, modID: string | null = null, reason: string | null = null, deleteMessages: boolean = false): Promise<Date> {
    const guild = client.guilds.cache.first();
    if (!guild) return Promise.reject('No guild found.');

    const timestamp = new Date();
    const expire = new Date(timestamp.getTime() + duration * 1000);

    try {
        await db.query(
            /*sql*/ `
            INSERT INTO punishment (user_id, "type", mod_id, reason, expire_timestamp, timestamp) 
            VALUES ($1, 'tban', $2, $3, $4, $5);`,
            [user.id, modID, reason, expire, timestamp]
            // ON CONFLICT (user_id) DO UPDATE
            // SET "type" = 'ban', mod_id = $2, reason = $3, expire_timestamp = $4, timestamp = $5
        );
    } catch (error) {
        console.error(error);
        log(`Failed to temp-ban <@${user.id}> for ${duration} seconds: an error occurred while accessing the database.`);
        return Promise.reject('Error while accessing the database.');
    }

    guild.members.ban(user, { reason: reason || 'No reason provided.', days: deleteMessages ? 7 : 0 });
    log(`${modID ? `<@${modID}>` : 'System'} temp-banned <@${user.id}> for ${duration} seconds (until ${expire.toLocaleString()}):\n\`${reason || 'No reason provided.'}\``);

    if (timestamp.getDate() === expire.getDate() && timestamp.getMonth() === expire.getMonth()) {
        const timeout = setTimeout(() => {
            unban(user.id);
        }, duration * 1000);

        const previousTimeout = store.tempbans.get(user.id);
        if (previousTimeout) clearTimeout(previousTimeout);

        store.tempbans.set(user.id, timeout);
    }

    return expire;
}

export async function ban(user: User, modID: string | null = null, reason: string | null = null, deleteMessages: boolean = false) {
    const timestamp = new Date();
    const guild = client.guilds.cache.first();
    if (!guild) return Promise.reject('No guild found.');

    try {
        await db.query(
            /*sql*/ `
            INSERT INTO punishment (user_id, "type", mod_id, reason, timestamp) 
            VALUES ($1, 'ban', $2, $3, $4);`,
            [user.id, modID, reason, timestamp]
            // ON CONFLICT (user_id) DO UPDATE
            // SET "type" = 'ban', mod_id = $2, reason = $3, timestamp = $4
        );
    } catch (error) {
        console.error(error);
        log(`Failed to ban <@${user.id}>: an error occurred while accessing the database.`);
        return Promise.reject('Error while accessing the database.');
    }

    guild.members.ban(user, { reason: reason || 'No reason provided.', days: deleteMessages ? 7 : 0 });
    log(`${modID ? `<@${modID}>` : 'System'} banned <@${user.id}>:\n\`${reason || 'No reason provided.'}\``);
}

export async function unban(userID: string, modID?: string) {
    const guild = client.guilds.cache.first();
    if (!guild) return Promise.reject('No guild found.');

    try {
        const deleted = (
            await db.query(
                /*sql*/ `
                WITH moved_rows AS (
                    DELETE FROM punishment 
                    WHERE ("type" = 'ban' OR "type" = 'tban') AND user_id = $1
                    RETURNING id, user_id, type, mod_id, reason, timestamp
                )
                INSERT INTO past_punishment
                SELECT DISTINCT *, $2::NUMERIC AS lifted_mod_id, $3::TIMESTAMP AS lifted_timestamp FROM moved_rows;`,
                [userID, modID || null, new Date()]
            )
        ).rowCount;
        if (deleted === 0) return Promise.reject(`The user <@${userID}> is not banned.`);
    } catch (error) {
        console.error(error);
        log(`Failed to unban <@${userID}>: an error occurred while accessing the database.`);
        return Promise.reject('Error while accessing the database.');
    }

    guild.members.unban(userID);

    const timeout = store.tempbans.get(userID);
    if (timeout) {
        clearTimeout(timeout);
        store.tempbans.delete(userID);
    }

    log(`${modID ? `<@${modID}>` : 'System'} unbanned <@${userID}>.`);
}
