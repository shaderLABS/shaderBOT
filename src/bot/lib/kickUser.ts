import { GuildMember, MessageEmbed, Snowflake, User } from 'discord.js';
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

export async function kickSpammer(user: User, modID: Snowflake | null = null, context: string | null = null) {
    const guild = getGuild();
    if (!guild) return Promise.reject('No guild found.');

    const timestamp = new Date();
    let dmed = true;

    try {
        await db.query(
            /*sql*/ `
            INSERT INTO past_punishment (user_id, "type", mod_id, reason, context_url, timestamp)
            VALUES ($1, 'kick', $2, 'Phished account used for spam.', $3, $4)
            RETURNING id;`,
            [user.id, modID, context, timestamp]
        );

        await user
            .send({
                embeds: [
                    new MessageEmbed({
                        author: { name: 'Your account has been compromised.' },
                        description:
                            'Your account has been used for spam. Please [reset your password](https://support.discord.com/hc/en-us/articles/218410947-I-forgot-my-Password-Where-can-I-set-a-new-one- "Guide for resetting your password"). After that, feel free to rejoin shaderLABS using [this invite link](https://discord.gg/RpzWN9S "Invite for shaderLABS").',
                        color: embedColor.blue,
                        footer: {
                            text: "DON'T FALL FOR PHISHING LINKS! ALWAYS CHECK THE URL BEFORE SIGNING IN.",
                        },
                    }),
                ],
            })
            .catch(() => {
                dmed = false;
            });
    } catch (error) {
        console.error(error);
        log(`Failed to kick ${parseUser(user)}: an error occurred while accessing the database.`, 'Kick Spammer');
        return Promise.reject('Error while accessing the database.');
    }

    if (await guild.bans.fetch(user).catch(() => undefined)) {
        await guild.members.unban(user, 'Temporarily unbanning an account used for spam before deleting its messages.');
        await guild.members.ban(user, { reason: 'Rebanning an account used for spam in order to delete its messages.', days: 1 });
    } else {
        await guild.members.ban(user, { reason: 'Temporarily banning an account used for spam in order to delete its messages.', days: 1 });
        await guild.members.unban(user, 'Unbanning an account used for spam after deleting its messages.');
    }

    return { dmed };
}
