import { Guild, GuildMember, Message, PermissionFlagsBits, TextChannel, ThreadChannel } from 'discord.js';
import { sendAutoResponse } from '../../autoResponseHandler.js';
import { settings } from '../../bot.js';
import { Event } from '../../eventHandler.js';
import { isGuildMessage } from '../../lib/misc.js';
import { matchBlacklist } from '../../lib/searchMessage.js';
import { checkSpam } from '../../lib/spamProtection.js';

export interface GuildMessage extends Message {
    channel: TextChannel | ThreadChannel;
    guild: Guild;
    member: GuildMember;
}

export const event: Event = {
    name: 'messageCreate',
    callback: async (message: Message) => {
        if (!isGuildMessage(message) || message.author.bot || (await checkSpam(message)) || mediaOnly(message) || matchBlacklist(message)) return;
        sendAutoResponse(message);
    },
};

const mediaURLs = /([a-zA-Z0-9]+:\/\/)?([a-zA-Z0-9_]+:[a-zA-Z0-9_]+@)?([a-zA-Z0-9.-]+\.[A-Za-z]{2,4})(:[0-9]+)?(\/.*)?/;
function mediaOnly(message: GuildMessage) {
    if (!settings.data.mediaChannelIDs.includes(message.channel.id) || message.attachments.size !== 0 || message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return false;
    if (mediaURLs.test(message.content)) return true;

    message.delete();
    return true;
}
