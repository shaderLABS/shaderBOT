import { GuildMember, Message, PermissionFlagsBits } from 'discord.js';
import { handleAutomaticResponse } from '../../automaticResponseHandler.js';
import { settings } from '../../bot.js';
import { Event } from '../../eventHandler.js';
import { matchBlacklist } from '../../lib/searchMessage.js';
import { checkSpam } from '../../lib/spamProtection.js';

export type GuildMessage = Message<true> & {
    member: GuildMember;
};

function isGuildMessage(message: Message): message is GuildMessage {
    return message.inGuild() && message.member !== null;
}

export const event: Event = {
    name: 'messageCreate',
    callback: (message: Message) => {
        if (message.author.bot || !isGuildMessage(message)) return;

        checkSpam(message);
        matchBlacklist(message) || checkMediaOnly(message) || handleAutomaticResponse(message);
    },
};

const mediaURLs = /([a-zA-Z0-9]+:\/\/)?([a-zA-Z0-9_]+:[a-zA-Z0-9_]+@)?([a-zA-Z0-9.-]+\.[A-Za-z]{2,4})(:[0-9]+)?(\/.*)?/;
function checkMediaOnly(message: GuildMessage) {
    if (!settings.data.mediaChannelIDs.includes(message.channel.id) || message.attachments.size !== 0 || message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return false;
    if (mediaURLs.test(message.content)) return true;

    message.delete();
    return true;
}
