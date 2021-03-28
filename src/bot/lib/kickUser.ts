import { GuildMember, MessageEmbed } from 'discord.js';
import { db } from '../../db/postgres.js';
import { embedColor } from './embeds.js';
import log from './log.js';
import { getGuild } from './misc.js';
import { formatTimeDate } from './time.js';

export async function kick(user: GuildMember, modID: string | null = null, reason: string | null = null) {
    const guild = getGuild();
    if (!guild) return Promise.reject('No guild found.');
    if (!user.kickable) return Promise.reject('The specified user is not kickable.');

    const timestamp = new Date();

    try {
        const kick = (
            await db.query(
                /*sql*/ `
                INSERT INTO past_punishment (user_id, "type", mod_id, reason, timestamp)
                VALUES ($1, 'kick', $2, $3, $4)
                RETURNING id;`,
                [user.id, modID, reason, timestamp]
            )
        ).rows[0];

        if (kick) {
            await user
                .send(
                    new MessageEmbed({
                        author: { name: 'You have been kicked from shaderLABS.' },
                        description: punishmentToString({ id: kick.id, reason: reason || 'No reason provided.', mod_id: modID, timestamp }),
                        color: embedColor.blue,
                    })
                )
                .catch(() => undefined);
        }
    } catch (error) {
        console.error(error);
        log(`Failed to kick <@${user.id}>: an error occurred while accessing the database.`);
        return Promise.reject('Error while accessing the database.');
    }

    await user.kick(reason || 'No reason provided.');
    log(`${modID ? `<@${modID}>` : 'System'} kicked <@${user.id}>:\n\`${reason || 'No reason provided.'}\``, 'Kick');
}

function punishmentToString(punishment: any) {
    return (
        `**Reason:** ${punishment.reason || 'No reason provided.'}\n` +
        `**Moderator:** ${punishment.mod_id ? `<@${punishment.mod_id}>` : 'System'}\n` +
        `**ID:** ${punishment.id}\n` +
        `**Created At:** ${formatTimeDate(new Date(punishment.timestamp))}`
    );
}
