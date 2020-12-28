import { GuildMember, Message, MessageMentions, User } from 'discord.js';
import uuid from 'uuid-random';
import { db } from '../../db/postgres.js';
import { client } from '../bot.js';
import { getGuild } from './misc.js';

// remove global flag because it affects the regex state
const USERS_PATTERN = new RegExp(MessageMentions.USERS_PATTERN, '');

export async function getUser(potentialUser: string, mentions?: MessageMentions): Promise<User> {
    try {
        if (USERS_PATTERN.test(potentialUser)) {
            const userMention = mentions?.users?.first();
            if (userMention) return userMention;
        }

        return (
            (!isNaN(+potentialUser)
                ? await client.users.fetch(potentialUser).catch(() => undefined)
                : (await getGuild()?.members.fetch({ query: potentialUser, limit: 1 }))?.first()?.user) || Promise.reject('Specified user not found.')
        );
    } catch {
        return Promise.reject('Specified user not found.');
    }
}

export async function getMember(potentialMember: string, mentions?: MessageMentions): Promise<GuildMember> {
    const guild = getGuild();

    try {
        if (USERS_PATTERN.test(potentialMember)) {
            const memberMention = mentions?.members?.first();
            if (memberMention) return memberMention;

            const userMention = mentions?.users?.first();
            if (userMention) {
                const member = await guild?.members.fetch(userMention).catch(() => undefined);
                if (member) return member;
            }
        }

        return (
            (!isNaN(+potentialMember)
                ? await guild?.members.fetch(potentialMember).catch(() => undefined)
                : (await guild?.members.fetch({ query: potentialMember, limit: 1 }))?.first()) || Promise.reject('Specified user not found.')
        );
    } catch {
        return Promise.reject('Specified user not found.');
    }
}

export async function getWarnUUID(message: Message, argument: string): Promise<string> {
    if (uuid.test(argument)) {
        return argument;
    } else {
        const { id } = await getUser(argument, message.mentions);
        const latestWarnID = (await db.query(/*sql*/ `SELECT id FROM warn WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 1`, [id])).rows[0];

        if (!latestWarnID) return Promise.reject('The specified user does not have any warnings.');
        return latestWarnID.id;
    }
}

export function removeArgumentsFromText(text: string, lastArgument: string) {
    return text.substring(text.indexOf(lastArgument) + lastArgument.length).trim();
}
