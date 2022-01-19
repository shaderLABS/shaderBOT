import { MessageEmbed, Snowflake, TextChannel, Util } from 'discord.js';
import { db } from '../../db/postgres.js';
import { client, settings } from '../bot.js';
import { embedColor } from './embeds.js';

export async function getBanInformation(id: Snowflake) {
    const [
        {
            rows: [ban],
        },
        {
            rows: [appeal],
        },
    ] = await Promise.all([
        db.query(
            /*sql*/ `
            SELECT id, mod_id, reason, context_url, expire_timestamp, timestamp
            FROM punishment
            WHERE user_id = $1 AND type = 'ban';`,
            [id]
        ),
        db.query(
            /*sql*/ `
            SELECT result, result_reason, result_timestamp, timestamp
            FROM appeal
            WHERE user_id = $1
            ORDER BY timestamp DESC
            LIMIT 1;`,
            [id]
        ),
    ]);

    ban.appeal = appeal;

    if (ban.mod_id) {
        const moderator = await client.users.fetch(ban.mod_id).catch(() => undefined);
        if (moderator) {
            ban.moderator = {
                id: moderator.id,
                username: moderator.username,
                discriminator: moderator.discriminator,
            };
        }
    }

    return ban;
}

export async function createBanAppeal(id: Snowflake, username: string, discriminator: number, avatarURL: string, reason: string) {
    if (reason.trim().length == 0 || reason.length > 2000 || !!(await db.query(/*sql*/ `SELECT 1 FROM appeal WHERE user_id = $1 AND result = 'pending' LIMIT 1;`, [id])).rows[0]) {
        return Promise.reject();
    }

    const channel = client.channels.cache.get(settings.appealChannelID);
    if (!channel || !(channel instanceof TextChannel)) return Promise.reject();

    const timestamp = new Date();

    const appealID = (
        await db.query(
            /*sql*/ `
            INSERT INTO appeal (user_id, reason, result, timestamp)
            VALUES ($1, $2, 'pending', $3)
            RETURNING id;`,
            [id, reason, timestamp]
        )
    ).rows[0]?.id;

    const message = await channel.send({
        embeds: [
            new MessageEmbed({
                author: {
                    name: `${username}#${discriminator}`,
                    iconURL: avatarURL,
                },
                title: 'Ban Appeal',
                color: embedColor.blue,
                description: `**User ID:** ${id}\n\n${Util.escapeMarkdown(reason)}`,
                timestamp,
                footer: {
                    text: 'ID: ' + appealID,
                },
            }),
        ],
    });

    db.query(/*sql*/ `UPDATE appeal SET message_id = $1 WHERE id = $2;`, [message.id, appealID]);
}
