import { Snowflake, TextChannel, ThreadChannel } from 'discord.js';
import { settings } from '../bot.js';
import { GuildMessage } from '../events/message/messageCreate.js';
import log from './log.js';
import { parseUser } from './misc.js';
import { mute } from './muteUser.js';

export function isSnowflake(potentialSnowflake: Snowflake | string): potentialSnowflake is Snowflake {
    return !isNaN(+potentialSnowflake) && potentialSnowflake.length >= 17 && potentialSnowflake.length <= 19;
}

export async function getContextURL(channel: TextChannel | ThreadChannel) {
    return (await channel.messages.fetch({ limit: 1 })).first()?.url;
}

export function matchBlacklist(message: GuildMessage) {
    if (settings.blacklist.strings.some((str) => message.content.includes(str))) {
        if (message.deletable) message.delete();
        mute(message.author.id, settings.blacklist.muteDuration, null, 'Sent message containing blacklisted content.', null, message.member).catch((e) =>
            log(`Failed to mute ${parseUser(message.author)} due to blacklisted content: ${e}`, 'Mute')
        );

        return true;
    }

    return false;
}
