import { Message } from 'discord.js';
import { sendAutoResponse } from '../../autoResponseHandler.js';
import { commands, settings } from '../../bot.js';
import { GuildMessage, runCommand } from '../../commandHandler.js';
import { Event } from '../../eventHandler.js';
import { isGuildMessage } from '../../lib/misc.js';
import { matchBlacklist } from '../../lib/searchMessage.js';
import { checkSpam } from '../../lib/spamProtection.js';

export const event: Event = {
    name: 'messageCreate',
    callback: (message: Message) => {
        if (!isGuildMessage(message) || message.author.bot || checkSpam(message)) return;

        const { content, channel } = message;
        if (mediaOnly(message)) return;

        if (content.startsWith(settings.prefix)) {
            const args = parseContent(content);
            const invoke = args?.shift()?.toLowerCase();

            if (invoke && args) {
                const command = commands.find((_value, key) => JSON.parse(key).includes(invoke));
                if (command) runCommand(command, message, invoke, args);
            }
        } else if (!matchBlacklist(message)) {
            sendAutoResponse(message);
        }
    },
};

const mediaURLs = /([a-zA-Z0-9]+:\/\/)?([a-zA-Z0-9_]+:[a-zA-Z0-9_]+@)?([a-zA-Z0-9.-]+\.[A-Za-z]{2,4})(:[0-9]+)?(\/.*)?/;
function mediaOnly(message: GuildMessage) {
    if (!settings.mediaChannelIDs.includes(message.channel.id) || message.attachments.size !== 0 || message.member.permissions.has('MANAGE_MESSAGES')) return false;
    if (mediaURLs.test(message.content)) return true;

    message.delete();
    return true;
}

function parseContent(content: string) {
    return content
        .slice(settings.prefix.length)
        .trim()
        .match(/\n|\\?.|^$/g)
        ?.reduce(
            (prev, curr) => {
                if (curr === '^') {
                    prev.quote ^= 1;
                } else if (!prev.quote && (curr === ' ' || curr === '\n')) {
                    if (prev.args[prev.args.length - 1]) prev.args.push('');
                } else {
                    prev.args[prev.args.length - 1] += curr.replace(/\\\^/g, '^');
                }
                return prev;
            },
            { args: [''], quote: 0 }
        ).args;
}
