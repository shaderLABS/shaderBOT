import { GuildMember, MessageEmbed } from 'discord.js';
import { db } from '../../db/postgres.js';
import { settings } from '../bot.js';
import log from './log.js';
import { getGuild } from './misc.js';
import { store } from './punishments.js';

export async function mute(userID: string, duration: number, modID: string | null = null, reason: string | null = null, member?: GuildMember): Promise<Date> {
    const role = await getGuild()?.roles.fetch(settings.muteRoleID);
    if (!role) {
        log(`Failed to mute <@${userID}> for ${duration} seconds: mute role not found.`);
        return Promise.reject('Mute role not found.');
    }

    const timestamp = new Date();
    const expire = new Date(timestamp.getTime() + duration * 1000);

    try {
        const overwrittenPunishment = (
            await db.query(
                /*sql*/ `
                WITH moved_rows AS (
                    DELETE FROM punishment 
                    WHERE "type" = 'mute' AND user_id = $1
                    RETURNING id, user_id, type, mod_id, reason, timestamp, expire_timestamp
                ), inserted_rows AS (
                    INSERT INTO past_punishment
                    SELECT id, user_id, type, mod_id, reason, timestamp, $2::NUMERIC AS lifted_mod_id, $3::TIMESTAMP AS lifted_timestamp FROM moved_rows
                )
                SELECT * FROM moved_rows;`,
                [userID, modID, new Date()]
            )
        ).rows[0];

        if (overwrittenPunishment) {
            const timeout = store.mutes.get(userID);
            if (timeout) {
                clearTimeout(timeout);
                store.mutes.delete(userID);
            }
        }

        const mute = (
            await db.query(
                /*sql*/ `
                INSERT INTO punishment (user_id, "type", mod_id, reason, expire_timestamp, timestamp) 
                VALUES ($1, 'mute', $2, $3, $4, $5)
                RETURNING id;`,
                [userID, modID, reason, expire, timestamp]
            )
        ).rows[0];

        if (mute && member) {
            await member
                .send(
                    new MessageEmbed({
                        author: { name: 'You have been muted on shaderLABS.' },
                        description: punishmentToString({ id: mute.id, reason: reason || 'No reason provided.', mod_id: modID, expire_timestamp: expire, timestamp }),
                        color: '#006fff',
                    })
                )
                .catch(() => undefined);
        }

        log(
            `${modID ? `<@${modID}>` : 'System'} muted <@${userID}> for ${duration} seconds (until ${expire.toLocaleString()}):\n\`${reason || 'No reason provided.'}\`${
                overwrittenPunishment ? `\n\n<@${userID}>'s previous mute has been overwritten:\n ${punishmentToString(overwrittenPunishment)}` : ''
            }`
        );
    } catch (error) {
        console.error(error);
        log(`Failed to mute <@${userID}> for ${duration} seconds: an error occurred while accessing the database.`);
        return Promise.reject('Error while accessing the database.');
    }

    if (member) member.roles.add(role);

    if (expire.getTime() < timestamp.setHours(23, 55, 0, 0)) {
        const timeout = setTimeout(() => {
            unmute(userID, undefined, member);
        }, duration * 1000);

        const previousTimeout = store.mutes.get(userID);
        if (previousTimeout) clearTimeout(previousTimeout);

        store.mutes.set(userID, timeout);
    }

    return expire;
}

export async function unmute(userID: string, modID?: string, member?: GuildMember) {
    const role = await getGuild()?.roles.fetch(settings.muteRoleID);
    if (!role) {
        log(`Failed to unmute <@${userID}>: mute role not found.`);
        return Promise.reject('Mute role not found.');
    }

    try {
        const deleted = (
            await db.query(
                /*sql*/ `
                WITH moved_rows AS (
                    DELETE FROM punishment 
                    WHERE "type" = 'mute' AND user_id = $1
                    RETURNING id, user_id, type, mod_id, reason, timestamp
                )
                INSERT INTO past_punishment (id, user_id, type, mod_id, reason, timestamp, lifted_mod_id, lifted_timestamp)
                SELECT *, $2::NUMERIC, $3::TIMESTAMP FROM moved_rows;`,
                [userID, modID || null, new Date()]
            )
        ).rowCount;
        if (deleted === 0) return Promise.reject(`The user <@${userID}> is not muted.`);
    } catch (error) {
        console.error(error);
        log(`Failed to unmute <@${userID}>: an error occurred while accessing the database.`);
        return Promise.reject('Error while accessing the database.');
    }

    if (member) member.roles.remove(role);

    const timeout = store.mutes.get(userID);
    if (timeout) {
        clearTimeout(timeout);
        store.mutes.delete(userID);
    }

    log(`${modID ? `<@${modID}>` : 'System'} unmuted <@${userID}>.`);
}

export async function checkMuteEvasion(member: GuildMember) {
    const role = await getGuild()?.roles.fetch(settings.muteRoleID);
    if (!role) return;

    const mute = (
        await db.query(
            /*sql*/ `
            SELECT id, user_id, type, mod_id, reason, timestamp, expire_timestamp
            FROM punishment 
            WHERE "type" = 'mute' AND user_id = $1
            LIMIT 1`,
            [member.id]
        )
    ).rows[0];

    if (!mute) return;

    member.roles.add(role);
    const expireTime = new Date(mute.expire_timestamp).getTime();
    const checkTime = new Date().getTime();

    if (expireTime < checkTime) {
        unmute(member.id, undefined, member).catch(() => undefined);
    } else if (expireTime < new Date().setHours(23, 55, 0, 0)) {
        const duration = expireTime - checkTime;

        const timeout = setTimeout(() => {
            unmute(member.id, undefined, member);
        }, duration);

        const previousTimeout = store.mutes.get(member.id);
        if (previousTimeout) clearTimeout(previousTimeout);

        store.mutes.set(member.id, timeout);
        log(`<@${member.id}> possibly tried to evade their mute (${mute.id}).`);
    }
}

function punishmentToString(punishment: any) {
    return `**Reason:** ${punishment.reason || 'No reason provided.'} 
    **Moderator:** <@${punishment.mod_id}> 
    **ID:** ${punishment.id} 
    **Created At:** ${new Date(punishment.timestamp).toLocaleString()} 
    **Expiring At:** ${punishment.expire_timestamp ? new Date(punishment.expire_timestamp).toLocaleString() : 'Permanent'}`;
}
