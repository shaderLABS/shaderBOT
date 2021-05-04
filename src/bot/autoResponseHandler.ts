import { DMChannel, MessageEmbed, MessageEmbedOptions, TextChannel } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { autoResponses, settings } from './bot.js';
import { GuildMessage } from './commandHandler.js';
import { sendInfo } from './lib/embeds.js';
import log from './lib/log.js';
import { JSONToAutoResponse } from './lib/pastaAutoResponse.js';

export const autoResponsePath = 'customContent/autoResponses';

export interface AutoResponse {
    readonly regex: RegExp;
    readonly directMessage?: boolean;
    readonly message?: string;
    readonly embed?: MessageEmbedOptions;
    readonly attachments?: string[];
    readonly maxMemberDuration?: number;
    readonly deleteAfter?: number;
}

export async function registerAutoResponses(dir: string) {
    const filePath = path.join(path.resolve(), dir);
    const files = await fs.readdir(filePath).catch((error) => {
        if (error.code !== 'ENOENT') console.error(error);
        return [];
    });

    for (const file of files) {
        const stat = await fs.stat(path.join(filePath, file));
        if (stat.isDirectory()) {
            registerAutoResponses(path.join(dir, file));
        } else if (file.endsWith('.json')) {
            const autoResponse = JSONToAutoResponse(await fs.readFile(path.join(filePath, file), 'utf-8'));

            console.debug('\x1b[30m\x1b[1m%s\x1b[0m', `Registering automatic response "${file}"...`);
            autoResponses.set(autoResponse.regex.source, autoResponse);
        }
    }
}

export async function sendAutoResponse(message: GuildMessage) {
    for (const [regex, autoResponse] of autoResponses) {
        if (autoResponse.regex.test(message.content)) {
            if (autoResponse.maxMemberDuration && message.member.joinedAt && autoResponse.maxMemberDuration < (Date.now() - message.member.joinedAt.getTime()) / 1000) return;

            let channel = autoResponse.directMessage ? await message.author.createDM() : message.channel;

            const responseMessage = fillVariables(message, autoResponse.message || '');
            let responseEmbed: MessageEmbed[] = [];

            try {
                if (autoResponse.embed) {
                    responseEmbed.push(new MessageEmbed(JSON.parse(fillVariables(message, JSON.stringify(autoResponse.embed)))));
                }

                const response = await channel.send(responseMessage, responseEmbed).catch(async () => {
                    let botChannel = message.guild.channels.cache.get(settings.botChannelID);
                    if (!botChannel || !(botChannel instanceof TextChannel)) return;
                    channel = botChannel;

                    return channel.send(responseMessage, responseEmbed);
                });

                if (!response) throw new Error();

                if (autoResponse.deleteAfter) {
                    setTimeout(() => response.delete(), autoResponse.deleteAfter * 1000);
                }

                if (autoResponse.directMessage && channel.id !== message.channel.id) {
                    sendInfo(message.channel, channel instanceof DMChannel ? `${message.author.toString()} check your DMs!` : `${message.author.toString()} go to <#${settings.botChannelID}>!`);
                }
            } catch {
                log(`Failed to send automatic response \`${regex}\`.`);
            }

            return;
        }
    }
}

function fillVariables(message: GuildMessage, text: string) {
    return text.replaceAll('{user}', message.author.toString());
}
