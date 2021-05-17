import { DMChannel, MessageAttachment, MessageEmbed, MessageEmbedOptions, TextChannel } from 'discord.js';
import { Dirent } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import { autoResponses, cooldowns, settings } from './bot.js';
import { GuildMessage } from './commandHandler.js';
import { sendInfo } from './lib/embeds.js';
import log from './lib/log.js';
import { JSONToAutoResponse } from './lib/pastaAutoResponse.js';

export const autoResponsePath = 'customContent/autoResponses';

export interface AutoResponse {
    readonly regex: RegExp;
    readonly flags?: string;
    readonly message?: string;
    readonly embed?: MessageEmbedOptions;
    readonly attachments?: string[];
    readonly directMessage?: boolean;
    readonly deleteAfter?: number;
    readonly maxMemberDuration?: number;
    readonly cooldown?: number;
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
                autoResponses.set(autoResponse.regex.source, autoResponse);
            }
        })
    );
}

export async function sendAutoResponse(message: GuildMessage) {
    for (const [regex, autoResponse] of autoResponses) {
        if (autoResponse.regex.test(message.content)) {
            if (
                (autoResponse.maxMemberDuration && message.member.joinedAt && autoResponse.maxMemberDuration < (Date.now() - message.member.joinedAt.getTime()) / 1000) ||
                (autoResponse.cooldown && cooldowns.has(`${message.member.id}:${regex}`))
            )
                return;

            let channel = autoResponse.directMessage ? await message.author.createDM() : message.channel;

            const responseMessage = fillVariables(message, autoResponse.message || '');
            const responseMessageAdditions: (MessageEmbed | MessageAttachment)[] = [];

            try {
                if (autoResponse.embed) {
                    responseMessageAdditions.push(new MessageEmbed(JSON.parse(fillVariables(message, JSON.stringify(autoResponse.embed)))));
                }

                if (autoResponse.attachments) {
                    responseMessageAdditions.push(...autoResponse.attachments.map((attachment) => new MessageAttachment(attachment)));
                }

                const response = await channel.send(responseMessage, responseMessageAdditions).catch(async () => {
                    let botChannel = message.guild.channels.cache.get(settings.botChannelID);
                    if (!botChannel || !(botChannel instanceof TextChannel)) return;
                    channel = botChannel;

                    return channel.send(responseMessage, responseMessageAdditions);
                });

                if (!response) throw new Error();

                if (autoResponse.deleteAfter) {
                    setTimeout(() => response.delete(), autoResponse.deleteAfter * 1000);
                }

                if (autoResponse.cooldown) {
                    const cooldownID = `${message.member.id}:${regex}`;
                    cooldowns.set(cooldownID, true);
                    setTimeout(() => cooldowns.delete(cooldownID), autoResponse.cooldown * 1000);
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
