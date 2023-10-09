import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, ChannelType, EmbedBuilder, Message } from 'discord.js';
import { db } from '../../db/postgres.js';
import { client, settings, timeoutStore } from '../bot.js';
import { EmbedColor } from './embeds.js';
import { getExpireTimestampCDN, parseUser } from './misc.js';

type JuxtaposeData = {
    images: [
        {
            src: string;
            label: string | null;
            credit: string;
        },
        {
            src: string;
            label: string | null;
            credit: string;
        }
    ];
    options: {
        animate: boolean;
        showLabels: boolean;
        showCredits: boolean;
        makeResponsive: boolean;
        mode: 'horizontal' | 'vertical';
        startingPosition: string;
    };
};

export async function readJuxtapose(juxtaposeID: string): Promise<JuxtaposeData> {
    const response = await fetch(`https://s3.amazonaws.com/uploads.knightlab.com/juxtapose/${juxtaposeID}.json`, {
        method: 'GET',
        headers: {
            DNT: '1',
            Accept: 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:104.0) Gecko/20100101 Firefox/104.0',
        },
    });

    return await response.json();
}

async function createJuxtapose(leftImageURL: string, rightImageURL: string, leftLabel: string | null, rightLabel: string | null, isVertical: boolean): Promise<string> {
    const response = await fetch('https://juxtapose.knightlab.com/juxtapose/create/', {
        method: 'POST',
        headers: {
            DNT: '1',
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:104.0) Gecko/20100101 Firefox/104.0',
        },
        body: JSON.stringify({
            images: [
                { src: leftImageURL, label: leftLabel, credit: '' },
                { src: rightImageURL, label: rightLabel, credit: '' },
            ],
            options: { animate: true, showLabels: true, showCredits: false, makeResponsive: true, mode: isVertical ? 'vertical' : 'horizontal', startingPosition: '50' },
        } satisfies JuxtaposeData),
    });

    if (response.status !== 200) return Promise.reject('The API request failed with code ' + response.status + '.');
    const data = await response.json();

    if (data.error) {
        return Promise.reject(data.error);
    }

    return data.uid;
}

export async function createJuxtaposeFromReply(message: Message, leftLabel: string | null, rightLabel: string | null, isVertical: boolean) {
    if (message.attachments.size < 2) return Promise.reject('The message does not have enough attachments to create a juxtapose.');

    let leftImageURL = message.attachments.at(-2)?.url;
    let rightImageURL = message.attachments.at(-1)?.url;
    if (!leftImageURL || !rightImageURL) return Promise.reject('Failed to retrieve at least one image URL for juxtapose.');

    const juxtaposeID = await createJuxtapose(leftImageURL, rightImageURL, leftLabel, rightLabel, isVertical);

    const leftExpireTimestamp = getExpireTimestampCDN(leftImageURL);
    const rightExpireTimestamp = getExpireTimestampCDN(rightImageURL);

    if (leftExpireTimestamp || rightExpireTimestamp) {
        ExpiringJuxtapose.create(juxtaposeID, message.channelId, message.id, new Date(Math.min(leftExpireTimestamp ?? Infinity, rightExpireTimestamp ?? Infinity)));
    }

    return juxtaposeID;
}

export async function createJuxtaposeFromURLs(message: Message, leftImageURL: string, rightImageURL: string, leftLabel: string | null, rightLabel: string | null, isVertical: boolean) {
    if (getExpireTimestampCDN(leftImageURL) || getExpireTimestampCDN(rightImageURL)) {
        return await createJuxtaposeFromReply(message, leftLabel, rightLabel, isVertical);
    } else {
        return await createJuxtapose(leftImageURL, rightImageURL, leftLabel, rightLabel, isVertical);
    }
}

export async function handleJuxtaposeRefreshInteraction(interaction: ButtonInteraction<'cached'>) {
    const oldJuxtaposeID = interaction.customId.split(':')[1];

    try {
        const oldJuxtaposeData = await readJuxtapose(oldJuxtaposeID);

        const juxtaposeID = await createJuxtaposeFromReply(interaction.message, oldJuxtaposeData.images[0].label, oldJuxtaposeData.images[1].label, oldJuxtaposeData.options.mode === 'vertical');
        if (!juxtaposeID) return;

        const juxtaposeURL = 'https://cdn.knightlab.com/libs/juxtapose/latest/embed/index.html?uid=' + juxtaposeID;

        const openButton = new ButtonBuilder({
            url: juxtaposeURL,
            style: ButtonStyle.Link,
            emoji: '🔗',
            label: 'Open',
        });

        await interaction.update({ components: [new ActionRowBuilder<ButtonBuilder>({ components: [openButton] })] });

        const logChannel = client.channels.cache.get(settings.data.logging.messageChannelID);
        if (logChannel?.type === ChannelType.GuildText) {
            logChannel.send({
                embeds: [
                    new EmbedBuilder({
                        color: EmbedColor.Blue,
                        author: {
                            name: 'Refresh Juxtapose',
                            iconURL: interaction.user.displayAvatarURL(),
                            url: interaction.message.url,
                        },
                        description: `${parseUser(interaction.user)} refreshed the [juxtapose](${juxtaposeURL}) of [this message](${interaction.message.url}).`,
                        footer: {
                            text: `ID: ${interaction.message.id}`,
                        },
                    }),
                ],
            });
        }
    } catch {
        console.error(`Failed to refresh juxtapose with UUID ${oldJuxtaposeID}.`);
    }
}

export class ExpiringJuxtapose {
    public readonly id: string;
    public readonly juxtaposeID: string;
    public readonly channelID: string;
    public readonly messageID: string;
    public readonly expireTimestamp: Date;

    constructor(data: { id: string; juxtapose_id: string; channel_id: string; message_id: string; expire_timestamp: string | number | Date }) {
        this.id = data.id;
        this.juxtaposeID = data.juxtapose_id;
        this.channelID = data.channel_id;
        this.messageID = data.message_id;
        this.expireTimestamp = new Date(data.expire_timestamp);
    }

    static async getExpiringToday() {
        const result = await db.query({
            text: /*sql*/ `
                SELECT * FROM expiring_juxtapose
                WHERE expire_timestamp IS NOT NULL AND expire_timestamp::DATE <= NOW()::DATE;`,
            name: 'juxtapose-expiring-today',
        });

        return result.rows.map((row) => new ExpiringJuxtapose(row));
    }

    static async getExpiringTomorrow() {
        const result = await db.query({
            text: /*sql*/ `
                SELECT * FROM expiring_juxtapose
                WHERE expire_timestamp IS NOT NULL AND expire_timestamp::DATE <= NOW()::DATE + INTERVAL '1 day';`,
            name: 'juxtapose-expiring-tomorrow',
        });

        return result.rows.map((row) => new ExpiringJuxtapose(row));
    }

    public static async getByChannelMessageID(channelID: string, messageID: string) {
        const result = await db.query({
            text: /*sql*/ `SELECT * FROM expiring_juxtapose WHERE channel_id = $1 AND message_id = $2;`,
            values: [channelID, messageID],
            name: 'juxtapose-channel-message-id',
        });
        if (result.rowCount === 0) return Promise.reject(`An expiring juxtapose with the specified channel and message ID does not exist.`);
        return new ExpiringJuxtapose(result.rows[0]);
    }

    public static async create(juxtaposeID: string, channelID: string, messageID: string, expireTimestamp: Date) {
        const result = await db.query({
            text: /*sql*/ `
                INSERT INTO expiring_juxtapose (juxtapose_id, channel_id, message_id, expire_timestamp)
                VALUES ($1, $2, $3, $4)
                RETURNING id;`,
            values: [juxtaposeID, channelID, messageID, expireTimestamp],
            name: 'juxtapose-create',
        });

        if (result.rowCount === 0) return Promise.reject('Failed to insert expiring juxtapose.');
        const { id } = result.rows[0];

        const juxtapose = new ExpiringJuxtapose({
            id,
            juxtapose_id: juxtaposeID,
            channel_id: channelID,
            message_id: messageID,
            expire_timestamp: expireTimestamp,
        });

        timeoutStore.set(juxtapose, true);

        return juxtapose;
    }

    public async expire() {
        await this.delete();

        const channel = client.channels.cache.get(this.channelID);
        if (!channel || !channel.isTextBased()) return;

        const message = await channel.messages.fetch(this.messageID).catch(() => undefined);
        if (!message) return;

        const refreshButton = new ButtonBuilder({
            customId: 'refreshJuxtapose:' + this.juxtaposeID,
            style: ButtonStyle.Primary,
            emoji: '⌛',
            label: 'Refresh',
        });

        await message.edit({ components: [new ActionRowBuilder<ButtonBuilder>({ components: [refreshButton] })] });
    }

    public async delete() {
        const result = await db.query({ text: /*sql*/ `DELETE FROM expiring_juxtapose WHERE id = $1 RETURNING id;`, values: [this.id], name: 'expiring-juxtapose-delete' });
        if (result.rowCount === 0) return Promise.reject(`Failed to delete expiring juxtapose ${this.id}.`);

        timeoutStore.delete(this);
    }
}
