import { GuildMember, MessageEmbed, Snowflake } from 'discord.js';
import { db } from '../../db/postgres.js';
import { embedColor } from './embeds.js';
import log from './log.js';
import { parseUser } from './misc.js';
import { punishmentToString, store } from './punishments.js';
import { formatTimeDate, secondsToString } from './time.js';

export async function mute(userID: Snowflake, duration: number, modID: Snowflake | null = null, reason: string, context: string | null = null, member?: GuildMember) {
    if (member && !member.manageable) return Promise.reject('The specified user is not manageable.');
    if (duration < 10 || duration > 2419200) return Promise.reject('The specified duration is outside of the API limits.');

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
                    RETURNING id, user_id, type, mod_id, reason, context_url, edited_timestamp, edited_mod_id, expire_timestamp, timestamp
                ), inserted_rows AS (
                    INSERT INTO past_punishment (id, user_id, type, mod_id, reason, context_url, edited_timestamp, edited_mod_id, lifted_timestamp, lifted_mod_id, timestamp)
                    SELECT id, user_id, type, mod_id, reason, context_url, edited_timestamp, edited_mod_id, $2::TIMESTAMP AS lifted_timestamp, $3::NUMERIC AS lifted_mod_id, timestamp FROM moved_rows
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
                INSERT INTO punishment (user_id, "type", mod_id, reason, context_url, expire_timestamp, timestamp)
                VALUES ($1, 'mute', $2, $3, $4, $5, $6)
                RETURNING id;`,
                [userID, modID, reason, context, expire, timestamp]
            )
        ).rows[0];

        if (mute && member) {
            await member
                .send({
                    embeds: [
                        new MessageEmbed({
                            author: { name: 'You have been muted on shaderLABS.' },
                            description: punishmentToString({ id: mute.id, reason, context_url: context, mod_id: modID, expire_timestamp: expire, timestamp }),
                            color: embedColor.blue,
                        }),
                    ],
                })
                .catch(() => {
                    dmed = false;
                });
        }

        log(
            `${modID ? parseUser(modID) : 'System'} muted ${parseUser(userID)} for ${secondsToString(duration)} (until ${formatTimeDate(expire)}):\n\`${reason}\`${
                overwrittenPunishment ? `\n\n${parseUser(userID)}'s previous mute has been overwritten:\n ${punishmentToString(overwrittenPunishment)}` : ''
            }${dmed ? '' : '\n\n*The target could not be DMed.*'}`,
            'Mute'
        );
    } catch (error) {
        console.error(error);
        log(`Failed to mute ${parseUser(userID)} for ${secondsToString(duration)}: an error occurred while accessing the database.`, 'Mute');
        return Promise.reject('Error while accessing the database.');
    }

    if (member) member.timeout(duration * 1000, reason);

    if (expire.getTime() < new Date().setHours(24, 0, 0, 0)) {
        const timeout = setTimeout(() => expireMute(userID), duration * 1000);

        const previousTimeout = store.mutes.get(userID);
        if (previousTimeout) clearTimeout(previousTimeout);

        store.mutes.set(userID, timeout);
    }

    return { expire, dmed };
}

export async function unmute(userID: Snowflake, modID?: Snowflake, member?: GuildMember) {
    if (member && !member.manageable) return Promise.reject('The specified user is not manageable.');

    try {
        const deleted = (
            await db.query(
                /*sql*/ `
                WITH moved_rows AS (
                    DELETE FROM punishment
                    WHERE "type" = 'mute' AND user_id = $1
                    RETURNING id, user_id, type, mod_id, reason, context_url, edited_timestamp, edited_mod_id, timestamp
                )
                INSERT INTO past_punishment (id, user_id, type, mod_id, reason, context_url, edited_timestamp, edited_mod_id, lifted_timestamp, lifted_mod_id, timestamp)
                SELECT id, user_id, type, mod_id, reason, context_url, edited_timestamp, edited_mod_id, $2::TIMESTAMP AS lifted_timestamp, $3::NUMERIC AS lifted_mod_id, timestamp FROM moved_rows;`,
                [userID, new Date(), modID || null]
            )
        ).rowCount;
        if (deleted === 0) return Promise.reject(`The user ${parseUser(userID)} is not muted.`);
    } catch (error) {
        console.error(error);
        log(`Failed to unmute ${parseUser(userID)}: an error occurred while accessing the database.`, 'Unmute');
        return Promise.reject('Error while accessing the database.');
    }

    if (member) member.timeout(null);

    const timeout = store.mutes.get(userID);
    if (timeout) {
        clearTimeout(timeout);
        store.mutes.delete(userID);
    }

    log(`${modID ? parseUser(modID) : 'System'} unmuted ${parseUser(userID)}.`, 'Unmute');
}

export async function expireMute(userID: Snowflake) {
    try {
        const expiredMute = (
            await db.query(
                /*sql*/ `
                WITH moved_rows AS (
                    DELETE FROM punishment
                    WHERE "type" = 'mute' AND user_id = $1
                    RETURNING id, user_id, type, mod_id, reason, context_url, edited_timestamp, edited_mod_id, timestamp
                )
                INSERT INTO past_punishment (id, user_id, type, mod_id, reason, context_url, edited_timestamp, edited_mod_id, lifted_timestamp, lifted_mod_id, timestamp)
                SELECT id, user_id, type, mod_id, reason, context_url, edited_timestamp, edited_mod_id, $2::TIMESTAMP AS lifted_timestamp, NULL AS lifted_mod_id, timestamp FROM moved_rows
                RETURNING id;`,
                [userID, new Date()]
            )
        ).rows[0];

        store.mutes.delete(userID);

        log(`${parseUser(userID)}'s mute (${expiredMute.id}) has expired.`, 'Expire Mute');
    } catch (error) {
        console.error(error);
        log(`Failed to expire ${parseUser(userID)}'s mute: an error occurred while accessing the database.`, 'Expire Mute');
    }
}
