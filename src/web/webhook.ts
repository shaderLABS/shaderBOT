import { ChannelType, EmbedBuilder } from 'discord.js';
import { t, type Static } from 'elysia';
import crypto from 'node:crypto';
import { client } from '../bot/bot.ts';
import { EmbedColor } from '../bot/lib/embeds.ts';
import { formatBytes, trimString } from '../bot/lib/misc.ts';

function signData(data: crypto.BinaryLike, key: crypto.BinaryLike) {
    return 'sha256=' + crypto.createHmac('sha256', key).update(data).digest('hex');
}

export function verifySignature(signature: string, data: crypto.BinaryLike, key: crypto.BinaryLike) {
    const signatureBuffer = Buffer.from(signature);
    const signedDataBuffer = Buffer.from(signData(data, key));

    if (signatureBuffer.length !== signedDataBuffer.length) return false;
    return crypto.timingSafeEqual(signatureBuffer, signedDataBuffer);
}

export const GITHUB_RELEASE_WEBHOOK_BODY = t.Object(
    {
        action: t.Literal('published'),
        release: t.Object({
            name: t.Nullable(t.String()),
            html_url: t.String(),
            body: t.Nullable(t.String()),
            assets: t.Array(
                t.Object({
                    name: t.String(),
                    browser_download_url: t.String(),
                    size: t.Number(),
                })
            ),
            author: t.Object({
                login: t.String(),
                avatar_url: t.Optional(t.String()),
                html_url: t.Optional(t.String()),
            }),
        }),
        repository: t.Object({
            full_name: t.String(),
        }),
    },
    { additionalProperties: true }
);

export async function releaseNotification(channelID: string, roleID: string, body: Static<typeof GITHUB_RELEASE_WEBHOOK_BODY>): Promise<number> {
    const channel = client.channels.cache.get(channelID);
    if (channel?.type !== ChannelType.GuildText) return 500;

    let description = `A new release has been published: [${body.release.name || 'Unknown Name'}](${body.release.html_url})`;

    if (body.release.body) {
        description += '\n\n> ' + body.release.body.trim().replaceAll('\n', '\n> ');
    }

    let assetsDescription = body.release.assets.reduce((list, asset) => {
        return list + `[${asset.name}](${asset.browser_download_url}) (${formatBytes(asset.size)})` + '\n';
    }, '\n\n');

    description = trimString(description, 4096 - assetsDescription.length) + assetsDescription;

    await channel.send({
        content: '<@&' + roleID + '>',
        embeds: [
            new EmbedBuilder({
                author: {
                    name: body.release.author.login || 'Unknown Author',
                    iconURL: body.release.author.avatar_url,
                    url: body.release.author.html_url,
                },
                title: body.repository.full_name,
                description,
                color: EmbedColor.Blue,
            }),
        ],
    });

    return 200;
}
