import crypto from 'crypto';
import { ChannelType, EmbedBuilder } from 'discord.js';
import { EmbedColor, EmbedIcon } from '../bot/lib/embeds.js';
import { formatBytes, getGuild, trimString } from '../bot/lib/misc.js';

function signData(data: crypto.BinaryLike, key: crypto.BinaryLike) {
    return 'sha256=' + crypto.createHmac('sha256', key).update(data).digest('hex');
}

export function verifySignature(signature: string, data: Buffer, key: crypto.BinaryLike) {
    const signatureBuffer = Buffer.from(signature);
    const signedDataBuffer = Buffer.from(signData(data, key));

    if (signatureBuffer.length !== signedDataBuffer.length) return false;
    return crypto.timingSafeEqual(signatureBuffer, signedDataBuffer);
}

export async function releaseNotification(channelID: string, roleID: string, req: any): Promise<number> {
    const guild = getGuild();
    if (!guild) return 500;

    const channel = guild.channels.cache.get(channelID);
    if (channel?.type !== ChannelType.GuildText) return 500;

    if (req.headers['x-github-event'] === 'release') {
        // GitHub Release Event

        // published: a release, pre-release, or draft of a release is published
        if (req.body.action !== 'published') return 204;

        let description = `A new release has been published: [${req.body.release?.name || 'Unknown Name'}](${req.body.release?.html_url})`;

        const body = req.body.release?.body?.trim();
        if (body) {
            description += '\n\n> ' + body.replaceAll('\n', '\n> ');
        }

        let assetsDescription = '';
        const assets = req.body.release?.assets;
        if (assets && Array.isArray(assets)) {
            assetsDescription = assets.reduce((list, asset) => list + `[${asset.name}](${asset.browser_download_url}) (${formatBytes(asset.size)})` + '\n', '\n\n');
        }

        description = trimString(description, 4096 - assetsDescription.length) + assetsDescription;

        await channel.send({
            content: '<@&' + roleID + '>',
            embeds: [
                new EmbedBuilder({
                    author: {
                        name: req.body.release?.author?.login || 'Unknown Author',
                        iconURL: req.body.release?.author?.avatar_url,
                        url: req.body.release?.author?.html_url,
                    },
                    title: req.body.repository?.full_name,
                    description,
                    color: EmbedColor.Blue,
                }),
            ],
        });
    } else {
        // Generic Release Event
        await channel.send({
            content: '<@&' + roleID + '>',
            embeds: [
                new EmbedBuilder({
                    author: {
                        name: 'A new release has been published!',
                        iconURL: EmbedIcon.Info,
                    },
                    color: EmbedColor.Blue,
                }),
            ],
        });
    }

    return 200;
}
