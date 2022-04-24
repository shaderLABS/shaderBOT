import { Attachment, EmbedBuilder, EmbedData } from 'discord.js';
import { Dirent } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import { autoResponses, cooldownStore, settings } from './bot.js';
import { GuildMessage } from './events/message/messageCreate.js';
import { sendInfo } from './lib/embeds.js';
import log from './lib/log.js';
import { isTextOrThreadChannel } from './lib/misc.js';
import { JSONToAutoResponse } from './lib/pastaAutoResponse.js';

export const autoResponsePath = 'customContent/autoResponses';

export interface AutoResponse {
    alias: string;
    regex: RegExp;
    flags?: string;
    message?: string;
    embed?: EmbedData;
    attachments?: string[];
    directMessage?: boolean;
    deleteAfter?: number;
    maxMemberDuration?: number;
    cooldown?: number;
}

export async function registerAutoResponses(dir: string) {
    const dirPath = path.join(path.resolve(), dir);
    const dirEntries: Dirent[] = await fs.readdir(dirPath, { withFileTypes: true }).catch((error) => {
        if (error.code !== 'ENOENT') console.error(error);
        return [];
    });

    return Promise.all(
        dirEntries.map(async (dirEntry) => {
            if (dirEntry.isDirectory()) {
                registerAutoResponses(path.join(dir, dirEntry.name));
            } else if (dirEntry.name.endsWith('.json')) {
                const autoResponse = JSONToAutoResponse(await fs.readFile(path.join(dirPath, dirEntry.name), 'utf-8'));
                autoResponses.set(autoResponse.alias, autoResponse);
            }
        })
    );
}

export async function sendAutoResponse(message: GuildMessage) {
    for (const [alias, autoResponse] of autoResponses) {
        if (autoResponse.regex.test(message.content)) {
            if (
                (autoResponse.maxMemberDuration && message.member.joinedAt && autoResponse.maxMemberDuration < (Date.now() - message.member.joinedAt.getTime()) / 1000) ||
                (autoResponse.cooldown && cooldownStore.has(alias, message.member))
            )
                return;

            let channel = autoResponse.directMessage ? await message.author.createDM() : message.channel;

            try {
                const responseContent = fillVariables(message, autoResponse.message || '');
                const responseFiles: Attachment[] = [];
                const responseEmbed = autoResponse.embed ? [new EmbedBuilder(JSON.parse(fillVariables(message, JSON.stringify(autoResponse.embed))))] : [];

                if (autoResponse.attachments) {
                    responseFiles.push(...autoResponse.attachments.map((attachment) => new Attachment(attachment)));
                }

                const response = await channel.send({ content: responseContent, embeds: responseEmbed, files: responseFiles }).catch(async () => {
                    let botChannel = message.guild.channels.cache.get(settings.data.botChannelID);
                    if (!botChannel || !isTextOrThreadChannel(botChannel)) return;
                    channel = botChannel;

                    return channel.send({ content: responseContent, embeds: responseEmbed, files: responseFiles });
                });

                if (!response) throw new Error();

                if (autoResponse.deleteAfter) {
                    setTimeout(() => response.delete(), autoResponse.deleteAfter * 1000);
                }

                if (autoResponse.cooldown) {
                    cooldownStore.add(alias, message.member, autoResponse.cooldown * 1000);
                }

                if (autoResponse.directMessage && channel.id !== message.channel.id) {
                    sendInfo(message.channel, channel.isDM() ? `${message.author.toString()} check your DMs!` : `${message.author.toString()} go to <#${settings.data.botChannelID}>!`);
                }
            } catch (error) {
                log(`Failed to send automatic response \`${alias}\`: \`${error}\``);
            }

            return;
        }
    }
}

function fillVariables(message: GuildMessage, text: string) {
    return text.replaceAll('{user}', message.author.toString());
}
