import { GuildMember, Message, User } from 'discord.js';
import uuid from 'uuid-random';
import { db } from '../../db/postgres.js';
import { client } from '../bot.js';
import { getGuild } from './misc.js';

export async function getUser(message: Message, potentialUser: string): Promise<User> {
    let user = message.mentions.users.first();

    if (!user) {
        try {
            if (!isNaN(+potentialUser)) user = await client.users.fetch(potentialUser).catch(() => undefined);
            if (!user) user = (await getGuild()?.members.fetch({ query: potentialUser, limit: 1 }))?.first()?.user;
        } catch {
            return Promise.reject('Specified user not found.');
        }
    }

    if (!user) return Promise.reject('Specified user not found.');
    return user;
}

export async function getMember(message: Message, potentialUser: string): Promise<GuildMember> {
    const guild = getGuild();
    let member = message.mentions.members?.first();

    try {
        if (!member) {
            if (!isNaN(+potentialUser)) member = await guild?.members.fetch(potentialUser).catch(() => undefined);
            if (!member) member = (await guild?.members.fetch({ query: potentialUser, limit: 1 }))?.first();
        }
    } catch {
        return Promise.reject('Specified user not found.');
    }

    if (!member) return Promise.reject('Specified user not found.');
    return member;
}

export async function getWarnUUID(message: Message, argument: string): Promise<string> {
    if (uuid.test(argument)) {
        return argument;
    } else {
        const { id } = await getUser(message, argument);
        const latestWarnID = (await db.query(/*sql*/ `SELECT id FROM warn WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 1`, [id])).rows[0];

        if (!latestWarnID) return Promise.reject('The specified user does not have any warnings.');
        return latestWarnID.id;
    }
}
