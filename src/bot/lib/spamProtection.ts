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

    const potentialSpam = cache.filter(
        (previousMessage) =>
            previousMessage &&
            message.author.id === previousMessage.authorID &&
            message.content === previousMessage.content &&
            message.channel.id !== previousMessage.channelID &&
            message.createdTimestamp - previousMessage.createdTimestamp < settings.spamProtection.timeThreshold * 1000
    ) as cachedMessage[];

    const isSpam = potentialSpam.length >= settings.spamProtection.messageThreshold - 1;
    if (isSpam) {
        mute(message.author.id, settings.spamProtection.muteDuration, null, 'Spamming messages in multiple channels.', message.member).catch((e) =>
            log(`Failed to mute ${parseUser(message.author)} due to spam: ${e}`)
        );

        if (message.deletable) message.delete();
        potentialSpam.forEach(async (spam) => {
            const spamChannel = message.guild.channels.cache.get(spam.channelID);
            if (spamChannel && spamChannel instanceof TextChannel) {
                const spamMessage = await spamChannel.messages.fetch(spam.id).catch(() => undefined);
                if (spamMessage?.deletable) {
                    spamMessage.delete();
                }
            }
        });
    }

    cache.unshift({ id: message.id, content: message.content, authorID: message.author.id, channelID: message.channel.id, createdTimestamp: message.createdTimestamp });
    cache.pop();

    return isSpam;
}
