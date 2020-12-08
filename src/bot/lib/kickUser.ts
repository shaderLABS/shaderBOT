import { GuildMember } from 'discord.js';
import { db } from '../../db/postgres.js';
import { client } from '../bot.js';
import log from './log.js';

export async function kick(user: GuildMember, modID: string | null = null, reason: string | null = null) {
    const timestamp = new Date();
    const guild = client.guilds.cache.first();
    if (!guild) return Promise.reject('No guild found.');

    try {
        await db.query(
            /*sql*/ `
            INSERT INTO past_punishment (user_id, "type", mod_id, reason, timestamp) 
            VALUES ($1, 'kick', $2, $3, $4);`,
            [user.id, modID, reason, timestamp]
        );
    } catch (error) {
        console.error(error);
        log(`Failed to kick <@${user.id}>: an error occurred while accessing the database.`);
        return Promise.reject('Error while accessing the database.');
    }

    user.kick(reason || 'No reason provided.');
    log(`${modID ? `<@${modID}>` : 'System'} kicked <@${user.id}>:\n\`${reason || 'No reason provided.'}\``);
}
