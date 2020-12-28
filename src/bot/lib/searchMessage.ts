import { GuildMember, MessageMentions, User } from 'discord.js';
import { client } from '../bot.js';
import { getGuild } from './misc.js';

export async function getUser(potentialUser: string): Promise<User> {
    try {
        const mention = potentialUser.match(MessageMentions.USERS_PATTERN);
        if (mention) potentialUser = mention[0].replace(/\D/g, '');

        if (!isNaN(+potentialUser) && potentialUser.length >= 17 && potentialUser.length <= 19) {
            const user = await client.users.fetch(potentialUser).catch(() => undefined);
            if (user) return user;
        }

        return (await getGuild()?.members.fetch({ query: potentialUser, limit: 1 }))?.first()?.user || Promise.reject('Specified user not found.');
    } catch {
        return Promise.reject('Specified user not found.');
    }
}

export async function getMember(potentialMember: string): Promise<GuildMember> {
    const guild = getGuild();

    try {
        const mention = potentialMember.match(MessageMentions.USERS_PATTERN);
        if (mention) potentialMember = mention[0].replace(/\D/g, '');

        if (!isNaN(+potentialMember) && potentialMember.length >= 17 && potentialMember.length <= 19) {
            const member = await guild?.members.fetch(potentialMember).catch(() => undefined);
            if (member) return member;
        }

        return (await guild?.members.fetch({ query: potentialMember, limit: 1 }))?.first() || Promise.reject('Specified member not found.');
    } catch {
        return Promise.reject('Specified member not found.');
    }
}

export function removeArgumentsFromText(text: string, lastArgument: string) {
    return text.substring(text.indexOf(lastArgument) + lastArgument.length).trim();
}
