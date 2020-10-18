import { GuildMember } from 'discord.js';
import { db } from '../../db/postgres.js';
import { client, settings } from '../bot.js';
import log from './log.js';

let mutes: Map<string, NodeJS.Timeout> = new Map();

export async function loadMuteTimeouts() {
    if (!client.user) return Promise.reject('The client is not logged in.');
    console.log('Loading mutes...');

    const expiringMutes = (
        await db.query(/*sql*/ `
            SELECT user_id::TEXT, mod_id::TEXT, expire_timestamp::TEXT 
            FROM temp_punishment 
            WHERE punishment = 0 AND expire_timestamp <= NOW() + INTERVAL '1 day 5 minutes';`)
    ).rows;

    for (const mute of expiringMutes) {
        const ms = new Date(mute.expire_timestamp).getTime() - new Date().getTime();

        if (ms <= 5000) {
            const member = await client.guilds.cache.first()?.members.fetch(mute.user_id);
            if (member) unmute(member);
            else log(`System could not unmute <@${mute.user_id}>: member not found.`);
        } else {
            const timeout = setTimeout(async () => {
                const member = await client.guilds.cache.first()?.members.fetch(mute.user_id);
                if (member) unmute(member);
                else log(`System could not unmute <@${mute.user_id}>: member not found.`);
            }, ms);

            const previousTimeout = mutes.get(mute.user_id);
            if (previousTimeout) clearTimeout(previousTimeout);

            mutes.set(mute.user_id, timeout);
        }
    }
}

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
            INSERT INTO temp_punishment (user_id, punishment, mod_id, reason, expire_timestamp, timestamp) 
            VALUES ($1, 0, $2, $3, $4, $5)
            ON CONFLICT (user_id) DO UPDATE 
                SET punishment = 0, mod_id = $2, reason = $3, expire_timestamp = $4, timestamp = $5;`,
            [member.id, modID, reason, expire, timestamp]
        );
    } catch (error) {
        console.error(error);
        log(`Failed to mute <@${member.id}> for ${duration} seconds: an error occurred while accessing the database.`);
        return Promise.reject('Error while accessing the database.');
    }

    member.roles.add(role);
    log(`${modID ? `<@${modID}>` : 'System'} muted <@${member.id}> for ${duration} seconds (until ${expire.toLocaleString()}):\n\n ${reason || 'No reason provided.'}`);

    if (timestamp.getDate() === expire.getDate() && timestamp.getMonth() === expire.getMonth()) {
        const timeout = setTimeout(() => {
            unmute(member);
        }, duration * 1000);

        const previousTimeout = mutes.get(member.id);
        if (previousTimeout) clearTimeout(previousTimeout);

        mutes.set(member.id, timeout);
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
                DELETE FROM temp_punishment 
                WHERE punishment = 0 AND user_id = $1;`,
                [member.id]
            )
        ).rowCount;
        if (deleted === 0) return Promise.reject(`The user <@${member.id}> is not muted.`);
    } catch {
        log(`Failed to unmute <@${member.id}>: an error occurred while accessing the database.`);
        return Promise.reject('Error while accessing the database.');
    }

    member.roles.remove(role);

    const timeout = mutes.get(member.id);
    if (timeout) {
        clearTimeout(timeout);
        mutes.delete(member.id);
    }

    log(`${modID ? `<@${modID}>` : 'System'} unmuted <@${member.id}>.`);
}
