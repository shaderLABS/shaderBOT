import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle } from 'discord.js';
import { db } from '../../db/postgres.js';
import { client, timeoutStore } from '../bot.js';
import { replyError } from './embeds.js';
import { getExpireTimestampCDN } from './misc.js';

export async function handleJuxtaposeRefreshInteraction(interaction: ButtonInteraction<'cached'>) {
    const uuid = interaction.customId.split(':')[1];
    const message = interaction.message;

    if (!message || message.attachments.size < 2) return;

    let leftImageURL = message.attachments.at(-2)?.url;
    let rightImageURL = message.attachments.at(-1)?.url;
    if (!leftImageURL || !rightImageURL) return;

    const oldDataRequest = await fetch(`https://s3.amazonaws.com/uploads.knightlab.com/juxtapose/${uuid}.json`, {
        method: 'GET',
        headers: {
            DNT: '1',
            Accept: 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:104.0) Gecko/20100101 Firefox/104.0',
        },
    });

    let juxtaposeData = await oldDataRequest.json();

    juxtaposeData.images[0].src = leftImageURL;
    juxtaposeData.images[1].src = rightImageURL;

    const refreshRequest = await fetch('https://juxtapose.knightlab.com/juxtapose/create/', {
        method: 'POST',
        headers: {
            DNT: '1',
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:104.0) Gecko/20100101 Firefox/104.0',
        },
        body: JSON.stringify(juxtaposeData),
    });

    if (refreshRequest.status !== 200) {
        replyError(interaction, 'The API request failed with code ' + refreshRequest.status + '.');
    }

    const refreshData = await refreshRequest.json();

    if (refreshData.error) {
        replyError(interaction, refreshData.error);
        return;
    }

    const juxtaposeURL = 'https://cdn.knightlab.com/libs/juxtapose/latest/embed/index.html?uid=' + refreshData.uid;

    const openButton = new ButtonBuilder({
        url: juxtaposeURL,
        style: ButtonStyle.Link,
        emoji: '🔗',
        label: 'Open',
    });

    interaction.update({ components: [new ActionRowBuilder<ButtonBuilder>({ components: [openButton] })] });

    const leftExpireTimestamp = getExpireTimestampCDN(leftImageURL);
    const rightExpireTimestamp = getExpireTimestampCDN(rightImageURL);

    if (leftExpireTimestamp && rightExpireTimestamp) {
        ExpiringJuxtapose.create(uuid, message.channel.id, message.id, new Date(Math.min(leftExpireTimestamp, rightExpireTimestamp)));
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
