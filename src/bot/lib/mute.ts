import { GuildMember } from 'discord.js';
import { db } from '../../db/postgres.js';
import { client, settings } from '../bot.js';
import log from './log.js';
import { store } from './punishments.js';

export async function mute(member: GuildMember, duration: number, modID: string | null = null, reason: string | null = null): Promise<Date> {
    const role = await client.guilds.cache.first()?.roles.fetch(settings.muteRoleID);
    if (!role) {
        log(`Failed to mute <@${member.id}> for ${duration} seconds: mute role not found.`);
        return Promise.reject('Mute role not found.');
    }

    const timestamp = new Date();
    const expire = new Date(timestamp.getTime() + duration * 1000);

    try {
        await db.query(
            /*sql*/ `
            INSERT INTO punishment (user_id, "type", mod_id, reason, expire_timestamp, timestamp) 
            VALUES ($1, 2, $2, $3, $4, $5)
            ON CONFLICT (user_id) DO UPDATE 
                SET "type" = 2, mod_id = $2, reason = $3, expire_timestamp = $4, timestamp = $5;`,
            [member.id, modID, reason, expire, timestamp]
        );
    } catch (error) {
        console.error(error);
        log(`Failed to mute <@${member.id}> for ${duration} seconds: an error occurred while accessing the database.`);
        return Promise.reject('Error while accessing the database.');
    }

    member.roles.add(role);
    log(`${modID ? `<@${modID}>` : 'System'} muted <@${member.id}> for ${duration} seconds (until ${expire.toLocaleString()}):\n\`${reason || 'No reason provided.'}\``);

    if (timestamp.getDate() === expire.getDate() && timestamp.getMonth() === expire.getMonth()) {
        const timeout = setTimeout(() => {
            unmute(member);
        }, duration * 1000);

        const previousTimeout = store.mutes.get(member.id);
        if (previousTimeout) clearTimeout(previousTimeout);

        store.mutes.set(member.id, timeout);
    }

    return expire;
}

export async function unmute(member: GuildMember, modID?: string) {
    const role = await client.guilds.cache.first()?.roles.fetch(settings.muteRoleID);
    if (!role) {
        log(`Failed to unmute <@${member.id}>: mute role not found.`);
        return Promise.reject('Mute role not found.');
    }

    try {
        const deleted = (
            await db.query(
                /*sql*/ `
                DELETE FROM punishment 
                WHERE "type" = 2 AND user_id = $1;`,
                [member.id]
            )
        ).rowCount;
        if (deleted === 0) return Promise.reject(`The user <@${member.id}> is not muted.`);
    } catch {
        log(`Failed to unmute <@${member.id}>: an error occurred while accessing the database.`);
        return Promise.reject('Error while accessing the database.');
    }

    member.roles.remove(role);

    const timeout = store.mutes.get(member.id);
    if (timeout) {
        clearTimeout(timeout);
        store.mutes.delete(member.id);
    }

    log(`${modID ? `<@${modID}>` : 'System'} unmuted <@${member.id}>.`);
}
