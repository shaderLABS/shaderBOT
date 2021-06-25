import { GuildMember, MessageEmbed, Snowflake } from 'discord.js';
import { db } from '../../db/postgres.js';
import { settings } from '../bot.js';
import { embedColor } from './embeds.js';
import log from './log.js';
import { getGuild, parseUser } from './misc.js';
import { store } from './punishments.js';
import { formatTimeDate, secondsToString } from './time.js';

export async function mute(userID: Snowflake, duration: number, modID: Snowflake | null = null, reason: string | null = null, member?: GuildMember) {
    if (member && !member.manageable) return Promise.reject('The specified user is not manageable.');

    const role = await getGuild()?.roles.fetch(settings.muteRoleID);
    if (!role) {
        log(`Failed to mute ${parseUser(userID)} for ${secondsToString(duration)}: mute role not found.`);
        return Promise.reject('Mute role not found.');
    }

    const timestamp = new Date();
    const expire = new Date(timestamp.getTime() + duration * 1000);
    let dmed = true;

    try {
        const overwrittenPunishment = (
            await db.query(
                /*sql*/ `
                WITH moved_rows AS (
                    DELETE FROM punishment
                    WHERE "type" = 'mute' AND user_id = $1
                    RETURNING id, user_id, type, mod_id, reason, edited_timestamp, edited_mod_id, expire_timestamp, timestamp
                ), inserted_rows AS (
                    INSERT INTO past_punishment
                    SELECT id, user_id, type, mod_id, reason, edited_timestamp, edited_mod_id, $2::TIMESTAMP AS lifted_timestamp, $3::NUMERIC AS lifted_mod_id, timestamp FROM moved_rows
                )
                SELECT * FROM moved_rows;`,
                [userID, timestamp, modID]
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
                .send({
                    embeds: [
                        new MessageEmbed({
                            author: { name: 'You have been muted on shaderLABS.' },
                            description: punishmentToString({ id: mute.id, reason: reason || 'No reason provided.', mod_id: modID, expire_timestamp: expire, timestamp }),
                            color: embedColor.blue,
                        }),
                    ],
                })
                .catch(() => {
                    dmed = false;
                });
        }

        log(
            `${modID ? parseUser(modID) : 'System'} muted ${parseUser(userID)} for ${secondsToString(duration)} (until ${formatTimeDate(expire)}):\n\`${reason || 'No reason provided.'}\`${
                overwrittenPunishment ? `\n\n${parseUser(userID)}'s previous mute has been overwritten:\n ${punishmentToString(overwrittenPunishment)}` : ''
            }${dmed ? '' : '\n\n*The target could not be DMed.*'}`
        );
    } catch (error) {
        console.error(error);
        log(`Failed to mute ${parseUser(userID)} for ${secondsToString(duration)}: an error occurred while accessing the database.`);
        return Promise.reject('Error while accessing the database.');
    }

    if (member) member.roles.add(role);

    if (expire.getTime() - timestamp.getTime() < new Date().setHours(24, 0, 0, 0) - timestamp.getTime()) {
        const timeout = setTimeout(async () => {
            const timeoutMember =
                member &&
                (await getGuild()
                    ?.members.fetch(member.id)
                    .catch(() => undefined));
            unmute(userID, undefined, timeoutMember).catch((e) => log(`Failed to unmute ${parseUser(userID)}: ${e}`));
        }, duration * 1000);

        const previousTimeout = store.mutes.get(userID);
        if (previousTimeout) clearTimeout(previousTimeout);

        store.mutes.set(userID, timeout);
    }

    return { expire, dmed };
}

export async function unmute(userID: Snowflake, modID?: Snowflake, member?: GuildMember) {
    if (member && !member.manageable) return Promise.reject('The specified user is not manageable.');

    const role = await getGuild()?.roles.fetch(settings.muteRoleID);
    if (!role) {
        log(`Failed to unmute ${parseUser(userID)}: mute role not found.`);
        return Promise.reject('Mute role not found.');
    }

    try {
        const deleted = (
            await db.query(
                /*sql*/ `
                WITH moved_rows AS (
                    DELETE FROM punishment
                    WHERE "type" = 'mute' AND user_id = $1
                    RETURNING id, user_id, type, mod_id, reason, edited_timestamp, edited_mod_id, timestamp
                )
                INSERT INTO past_punishment
                SELECT id, user_id, type, mod_id, reason, edited_timestamp, edited_mod_id, $2::TIMESTAMP AS lifted_timestamp, $3::NUMERIC AS lifted_mod_id, timestamp FROM moved_rows;`,
                [userID, new Date(), modID || null]
            )
        ).rowCount;
        if (deleted === 0) return Promise.reject(`The user ${parseUser(userID)} is not muted.`);
    } catch (error) {
        console.error(error);
        log(`Failed to unmute ${parseUser(userID)}: an error occurred while accessing the database.`);
        return Promise.reject('Error while accessing the database.');
    }

    if (member) member.roles.remove(role);

    const timeout = store.mutes.get(userID);
    if (timeout) {
        clearTimeout(timeout);
        store.mutes.delete(userID);
    }

    log(`${modID ? parseUser(modID) : 'System'} unmuted ${parseUser(userID)}.`);
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
    const checkTime = Date.now();

    if (expireTime < checkTime) {
        unmute(member.id, undefined, member).catch(() => undefined);
    } else if (expireTime < new Date().setHours(23, 55, 0, 0)) {
        const duration = expireTime - checkTime;

        const timeout = setTimeout(async () => {
            const timeoutMember = await getGuild()
                ?.members.fetch(member.id)
                .catch(() => undefined);
            unmute(member.id, undefined, timeoutMember);
        }, duration);

        const previousTimeout = store.mutes.get(member.id);
        if (previousTimeout) clearTimeout(previousTimeout);

        store.mutes.set(member.id, timeout);
        log(`${parseUser(member.user)} possibly tried to evade their mute (${mute.id}).`);
    }
}

function punishmentToString(punishment: any) {
    return (
        `**Reason:** ${punishment.reason || 'No reason provided.'}\n` +
        `**Moderator:** ${punishment.mod_id ? parseUser(punishment.mod_id) : 'System'}\n` +
        `**ID:** ${punishment.id}\n` +
        `**Created At:** ${formatTimeDate(new Date(punishment.timestamp))}\n` +
        `**Expiring At:** ${punishment.expire_timestamp ? formatTimeDate(new Date(punishment.expire_timestamp)) : 'Permanent'}`
    );
}
