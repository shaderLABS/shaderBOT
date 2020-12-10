import { User, Message } from 'discord.js';
import { client } from '../bot.js';
import uuid from 'uuid-random';
import { db } from '../../db/postgres.js';

export async function getUser(message: Message, potentialUser: string): Promise<User> {
    let user = message.mentions.users.first();
    if (!user) {
        user = client.users.cache.find((user) => user.username === potentialUser);
        if (!user) {
            try {
                if (!isNaN(Number(potentialUser))) user = await client.users.fetch(potentialUser);
                if (!user) return Promise.reject('Specified user not found.');
            } catch (error) {
                return Promise.reject('Specified user not found.');
            }
        }
    }

    return user;
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
