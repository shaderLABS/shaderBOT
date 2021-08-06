import { GuildMember, MessageMentions, Snowflake, TextChannel, ThreadChannel, User } from 'discord.js';
import { client, settings } from '../bot.js';
import { GuildMessage } from '../commandHandler.js';
import { sendInfo } from './embeds.js';
import log from './log.js';
import { getGuild, parseUser } from './misc.js';
import { mute } from './muteUser.js';

export function isSnowflake(potentialSnowflake: Snowflake | string): potentialSnowflake is Snowflake {
    return !isNaN(+potentialSnowflake) && potentialSnowflake.length >= 17 && potentialSnowflake.length <= 19;
}

export async function getUser(potentialUser: Snowflake | string, confirmation?: { author: User; channel: TextChannel | ThreadChannel }): Promise<User | undefined> {
    const mention = potentialUser.match(MessageMentions.USERS_PATTERN);
    if (mention) potentialUser = mention[0].replace(/\D/g, '');

    if (isSnowflake(potentialUser)) {
        const user = await client.users.fetch(potentialUser).catch(() => undefined);
        if (user) return user;
    }

    const user = (
        await getGuild()
            ?.members.fetch({ query: potentialUser, limit: 1 })
            .catch(() => undefined)
    )?.first()?.user;
    if (user) {
        if (confirmation) await confirmUser(user, confirmation.author, confirmation.channel);
        return user;
    }
}

export async function requireUser(potentialUser: string, confirmation?: { author: User; channel: TextChannel | ThreadChannel }): Promise<User> {
    return (await getUser(potentialUser, confirmation)) || Promise.reject('Specified user not found.');
}

export async function getMember(potentialMember: string, confirmation?: { author: User; channel: TextChannel | ThreadChannel }): Promise<GuildMember | undefined> {
    const guild = getGuild();

    const mention = potentialMember.match(MessageMentions.USERS_PATTERN);
    if (mention) potentialMember = mention[0].replace(/\D/g, '');

    if (isSnowflake(potentialMember)) {
        const member = await guild?.members.fetch(potentialMember).catch(() => undefined);
        if (member) return member;
    }

    const member = (await guild?.members.fetch({ query: potentialMember, limit: 1 }).catch(() => undefined))?.first();
    if (member) {
        if (confirmation) await confirmUser(member.user, confirmation.author, confirmation.channel);
        return member;
    }
}

export async function requireMember(potentialMember: string, confirmation?: { author: User; channel: TextChannel | ThreadChannel }): Promise<GuildMember> {
    return (await getMember(potentialMember, confirmation)) || Promise.reject('Specified member not found.');
}

async function confirmUser(user: User, author: User, channel: TextChannel | ThreadChannel): Promise<void> {
    const confirmation = await sendInfo(channel, `Please confirm that ${parseUser(user)} is the correct user.`);

    await confirmation.react('✅');
    await confirmation.react('❌');

    try {
        const reaction = (
            await confirmation.awaitReactions({ filter: (reaction, reactor) => !!reaction.emoji.name && ['✅', '❌'].includes(reaction.emoji.name) && reactor.id === author.id, max: 1, idle: 300000 })
        ).first();
        confirmation.delete();

        if (!reaction) {
            await sendInfo(channel, 'The user confirmation was cancelled due to inactivity.');
            return Promise.reject();
        }

        if (reaction.emoji.name === '❌') {
            await sendInfo(channel, 'The user confirmation was rejected.');
            return Promise.reject();
        }
    } catch {
        confirmation.delete();
        return Promise.reject('The user confirmation failed.');
    }
}

export function removeArgumentsFromText(text: string, lastArgument: string) {
    return text.substring(text.indexOf(lastArgument) + lastArgument.length).trim();
}

export function matchBlacklist(message: GuildMessage) {
    if (settings.blacklist.strings.some((str) => message.content.includes(str))) {
        if (message.deletable) message.delete();
        mute(message.author.id, settings.blacklist.muteDuration, null, 'Sent message containing blacklisted content.', message.member).catch((e) =>
            log(`Failed to mute ${parseUser(message.author)} due to blacklisted content: ${e}`)
        );

        return true;
    }

    return false;
}
