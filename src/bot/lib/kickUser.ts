import { GuildMember, MessageEmbed, Snowflake } from 'discord.js';
import { db } from '../../db/postgres.js';
import { embedColor } from './embeds.js';
import log from './log.js';
import { getGuild, parseUser } from './misc.js';
import { pastPunishmentToString } from './punishments.js';

export async function kick(user: GuildMember, modID: Snowflake | null = null, reason: string, context: string | null = null) {
    const guild = getGuild();
    if (!guild) return Promise.reject('No guild found.');
    if (!user.kickable) return Promise.reject('The specified user is not kickable.');

    const timestamp = new Date();
    let dmed = true;

    try {
        const kick = (
            await db.query(
                /*sql*/ `
                INSERT INTO past_punishment (user_id, "type", mod_id, reason, context_url, timestamp)
                VALUES ($1, 'kick', $2, $3, $4, $5)
                RETURNING id;`,
                [user.id, modID, reason, context, timestamp]
            )
        ).rows[0];

        if (kick) {
            await user
                .send({
                    embeds: [
                        new MessageEmbed({
                            author: { name: 'You have been kicked from shaderLABS.' },
                            description: pastPunishmentToString({ id: kick.id, reason, context_url: context, mod_id: modID, timestamp }),
                            color: embedColor.blue,
                        }),
                    ],
                })
                .catch(() => {
                    dmed = false;
                });
        }
    } catch (error) {
        console.error(error);
        log(`Failed to kick ${parseUser(user.user)}: an error occurred while accessing the database.`, 'Kick');
        return Promise.reject('Error while accessing the database.');
    }

    await user.kick(reason);
    log(`${modID ? parseUser(modID) : 'System'} kicked ${parseUser(user.user)}:\n\`${reason}\`${dmed ? '' : '\n\n*The target could not be DMed.*'}`, 'Kick');
    return { dmed };
}
