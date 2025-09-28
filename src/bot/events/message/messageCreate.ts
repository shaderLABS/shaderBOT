import { Events, Message, PermissionFlagsBits } from 'discord.js';
import { handleAutomaticResponse } from '../../automaticResponseHandler.ts';
import { settings } from '../../bot.ts';
import type { Event } from '../../eventHandler.ts';
import type { NonNullableProperty } from '../../lib/misc.ts';
import { matchBlacklist } from '../../lib/searchMessage.ts';
import { checkSpam } from '../../lib/spamProtection.ts';

export type GuildMessage = NonNullableProperty<Message<true>, 'member'>;

function isGuildMessage(message: Message): message is GuildMessage {
    return message.inGuild() && message.member !== null;
}

export const event: Event = {
    name: Events.MessageCreate,
    callback: (message) => {
        if (message.author.bot || !isGuildMessage(message)) return;

        checkSpam(message);
        if (matchBlacklist(message) || checkMediaOnly(message) || handleAutomaticResponse(message)) return;
    },
};

const MEDIA_URL_REGEXP = /([a-zA-Z0-9]+:\/\/)?([a-zA-Z0-9_]+:[a-zA-Z0-9_]+@)?([a-zA-Z0-9.-]+\.[A-Za-z]{2,4})(:[0-9]+)?(\/.*)?/;
function checkMediaOnly(message: GuildMessage) {
    if (!settings.data.mediaChannelIDs.includes(message.channelId) || message.attachments.size !== 0 || message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return false;
    if (MEDIA_URL_REGEXP.test(message.content)) return true;

    message.delete();
    return true;
}
