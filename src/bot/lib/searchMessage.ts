import { Snowflake } from 'discord.js';
import { settings } from '../bot.js';
import { GuildCommandInteraction } from '../events/interactionCreate.js';
import { GuildMessage } from '../events/message/messageCreate.js';
import { replyError } from './embeds.js';
import log from './log.js';
import { isTextOrThreadChannel, parseUser } from './misc.js';
import { mute } from './muteUser.js';

export function isSnowflake(potentialSnowflake: Snowflake | string): potentialSnowflake is Snowflake {
    return !isNaN(+potentialSnowflake) && potentialSnowflake.length >= 17 && potentialSnowflake.length <= 19;
}

export async function getContextURL(interaction: GuildCommandInteraction, targetID?: Snowflake) {
    const customURL = interaction.options.getString('context', false);

    if (customURL) {
        const IDs = customURL.split('/');
        const messageID = IDs.pop();
        const channelID = IDs.pop();

        if (!messageID || !channelID) {
            replyError(interaction, 'The specified message URL is invalid.');
            return;
        }

        const channel = interaction.guild.channels.cache.get(channelID);
        if (!channel || !isTextOrThreadChannel(channel)) {
            replyError(interaction, 'The specified message URL points to an invalid channel.');
            return;
        }

        const message = await channel.messages.fetch(messageID);
        if (!message) {
            replyError(interaction, 'The specified message URL points to an invalid message.');
            return;
        }

        return message.url;
    } else {
        const targetLastMessage = interaction.channel.messages.cache.filter((message) => message.author.id == targetID).last()?.url;
        if (targetLastMessage) return targetLastMessage;

        const channelLastMessage = (await interaction.channel.messages.fetch({ limit: 1 })).first()?.url;
        if (channelLastMessage) return channelLastMessage;

        replyError(interaction, 'Failed to fetch a context URL. Please specify it manually using the `context` argument.');
    }
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
