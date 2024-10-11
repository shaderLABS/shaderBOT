import { ChannelType, EmbedBuilder } from 'discord.js';
import { t, type Static } from 'elysia';
import { client } from '../bot/bot.ts';
import { EmbedColor } from '../bot/lib/embeds.ts';
import { formatBytes, trimString } from '../bot/lib/misc.ts';

// export async function verifySignature(rawSignature: string, data: Uint8Array, rawKey: Buffer): Promise<boolean> {
//     const key = await crypto.subtle.importKey('raw', rawKey, { name: 'HMAC', hash: { name: 'SHA-256' } }, false, ['verify']);
//     const signature = Buffer.from(rawSignature.replace('sha256=', ''), 'hex');

//     return await crypto.subtle.verify('HMAC', key, signature, data);
// }

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
            html_url: t.String(),
        }),
    },
    { additionalProperties: true }
);

export const GITHUB_PING_WEBHOOK_BODY = t.Object(
    {
        hook: t.Object({
            events: t.Array(t.String()),
        }),
        repository: t.Object({
            full_name: t.String(),
            html_url: t.String(),
        }),
        sender: t.Object({
            login: t.String(),
            avatar_url: t.Optional(t.String()),
            html_url: t.Optional(t.String()),
        }),
    },
    { additionalProperties: true }
);

export async function pingNotification(channelID: string, body: Static<typeof GITHUB_PING_WEBHOOK_BODY>): Promise<number> {
    const channel = client.channels.cache.get(channelID);
    if (channel?.type !== ChannelType.GuildText) return 500;

    let description = 'A webhook has been added to this project.';

    if (!body.hook.events.includes('release') && !body.hook.events.includes('*')) {
        description += '\n\nThis webhook does not have the `release` event enabled. Please enable it to receive release notifications.';
    }

    await channel.send({
        embeds: [
            new EmbedBuilder({
                author: {
                    name: body.sender.login || 'Unknown Author',
                    iconURL: body.sender.avatar_url,
                    url: body.sender.html_url,
                },
                title: body.repository.full_name,
                url: body.repository.html_url,
                description,
                color: EmbedColor.Green,
            }),
        ],
    });

    return 200;
}

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
                url: body.repository.html_url,
                description,
                color: EmbedColor.Blue,
            }),
        ],
    });

    return 200;
}
