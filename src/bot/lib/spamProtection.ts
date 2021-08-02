import { TextChannel } from 'discord.js';
import { settings } from '../bot.js';
import { GuildMessage } from '../commandHandler.js';
import log from './log.js';
import { parseUser } from './misc.js';
import { mute } from './muteUser.js';

type cachedMessage = {
    id: string;
    authorID: string;
    channelID: string;
    content: string;
    createdTimestamp: number;
};

const cache: (cachedMessage | undefined)[] = new Array(settings.spamProtection.cacheLength);

export function checkSpam(message: GuildMessage) {
    if (message.attachments.size || message.content.length < settings.spamProtection.characterThreshold || !message.content.includes('http')) return false;

    const currentMessage = {
        id: message.id,
        content: message.content,
        authorID: message.author.id,
        channelID: message.channel.id,
        createdTimestamp: message.createdTimestamp,
    };

    const potentialSpam = cache.filter(
        (previousMessage) =>
            previousMessage &&
            currentMessage.authorID === previousMessage.authorID &&
            currentMessage.content === previousMessage.content &&
            currentMessage.channelID !== previousMessage.channelID &&
            currentMessage.createdTimestamp - previousMessage.createdTimestamp < settings.spamProtection.timeThreshold * 1000
    );

    const isSpam = potentialSpam.length >= settings.spamProtection.messageThreshold - 1;
    if (isSpam) {
        mute(message.author.id, settings.spamProtection.muteDuration, null, 'Spamming messages in multiple channels.', message.member).catch((e) =>
            log(`Failed to mute ${parseUser(message.author)} due to spam: ${e}`)
        );

        const spamMessages = cache.filter((previousMessage) => previousMessage && message.author.id === previousMessage.authorID) as cachedMessage[];
        const guild = message.guild;

        message.delete().catch(() => undefined);

        for (const spam of spamMessages) {
            const spamChannel = guild.channels.cache.get(spam.channelID);
            if (spamChannel && spamChannel instanceof TextChannel) {
                spamChannel.messages.delete(spam.id).catch(() => undefined);
            }
        }
    }

    cache.unshift(currentMessage);
    cache.pop();

    return isSpam;
}
