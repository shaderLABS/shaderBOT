import { AttachmentBuilder, ChannelType, EmbedBuilder, type EmbedData } from 'discord.js';
import path from 'node:path';
import { automaticResponsePath } from '../automaticResponseHandler.ts';
import { client, cooldownStore, settings } from '../bot.ts';
import type { GuildMessage } from '../events/message/messageCreate.ts';
import { sendInfo } from './embeds.ts';
import { stringToFileName } from './misc.ts';

type AutomaticResponseData = {
    alias: string;
    regex: string;
    flags?: string;
    content?: string;
    embedData?: EmbedData;
    attachmentURLs?: string[];
    directMessage?: boolean;
    deleteAfter?: number;
    maxMemberDuration?: number;
    cooldown?: number;
};

export class AutomaticResponse {
    public alias: string;
    public regex: RegExp;

    public content?: string;
    public embedData?: EmbedData;
    public attachmentURLs?: string[];

    private embedRaw?: string;
    private attachments: AttachmentBuilder[];

    public directMessage?: boolean;
    public deleteAfter?: number;
    public maxMemberDuration?: number;
    public cooldown?: number;

    constructor(data: AutomaticResponseData) {
        this.alias = data.alias;
        this.regex = new RegExp(data.regex, data.flags);

        this.content = data.content;
        this.embedData = data.embedData;
        this.attachmentURLs = data.attachmentURLs;

        this.embedRaw = data.embedData ? JSON.stringify(data.embedData) : undefined;
        this.attachments = data.attachmentURLs ? data.attachmentURLs.map((url) => new AttachmentBuilder(url)) : [];

        this.directMessage = data.directMessage;
        this.deleteAfter = data.deleteAfter;
        this.maxMemberDuration = data.maxMemberDuration;
        this.cooldown = data.cooldown;
    }

    public toData(): AutomaticResponseData {
        return {
            alias: this.alias,
            regex: this.regex.source,
            flags: this.regex.flags,
            content: this.content,
            embedData: this.embedData,
            attachmentURLs: this.attachmentURLs,
            directMessage: this.directMessage,
            deleteAfter: this.deleteAfter,
            maxMemberDuration: this.maxMemberDuration,
            cooldown: this.cooldown,
        };
    }

    public toJSON() {
        return JSON.stringify(this.toData(), null, '\t');
    }

    public getFileName() {
        return stringToFileName(this.alias);
    }

    private getContent(message: GuildMessage) {
        return this.content?.replaceAll('{user}', message.author.toString());
    }

    private getEmbed(message: GuildMessage) {
        return this.embedRaw ? [new EmbedBuilder(JSON.parse(this.embedRaw.replaceAll('{user}', message.author.toString())))] : [];
    }

    public async send(message: GuildMessage) {
        if (
            (this.maxMemberDuration && message.member.joinedAt && this.maxMemberDuration * 1000 < Date.now() - message.member.joinedAt.getTime()) ||
            (this.cooldown && cooldownStore.has(this.alias, message.member))
        )
            return;

        let channel = this.directMessage ? await message.author.createDM() : message.channel;

        const content = this.getContent(message);
        const embeds = this.getEmbed(message);

        const response = await channel.send({ content, embeds, files: this.attachments }).catch(async () => {
            let botChannel = client.channels.cache.get(settings.data.botChannelID);
            if (botChannel?.type !== ChannelType.GuildText) return Promise.reject('Failed to resolve bot channel.');
            channel = botChannel;

            return channel.send({ content, embeds, files: this.attachments });
        });

        if (this.deleteAfter) setTimeout(() => response.delete(), this.deleteAfter * 1000);
        if (this.cooldown) cooldownStore.add(this.alias, message.member, this.cooldown * 1000);

        if (this.directMessage && channel.id !== message.channelId) {
            sendInfo(message.channel, {
                description: channel.type === ChannelType.DM ? `${message.author.toString()}, check your DMs!` : `${message.author.toString()}, go to <#${settings.data.botChannelID}>!`,
            });
        }
    }

    public async save() {
        await Bun.write(path.join(automaticResponsePath, this.getFileName()), this.toJSON(), {
            createPath: true,
        });
    }
}
