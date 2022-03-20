import crypto from 'crypto';
import { MessageEmbed } from 'discord.js';
import { embedColor, embedIcon } from '../bot/lib/embeds.js';
import { formatBytes, getGuild, isTextOrThreadChannel } from '../bot/lib/misc.js';

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
    if (!channel || !isTextOrThreadChannel(channel)) return 500;

    if (req.headers['x-github-event'] === 'release') {
        // GitHub Release Event

        // published: a release, pre-release, or draft of a release is published
        if (req.body.action !== 'published') return 204;

        let description = `A new release has been published: [${req.body.release?.name || 'Unknown Name'}](${req.body.release?.html_url})`;

        const body = req.body.release?.body?.trim();
        if (body) {
            description += '\n\n> ' + body.replaceAll('\n', '\n> ');
        }

        const assets = req.body.release?.assets;
        if (assets && Array.isArray(assets)) {
            description += assets.reduce((prev, curr) => prev + `[${curr.name}](${curr.browser_download_url}) (${formatBytes(curr.size)})` + '\n', '\n\n');
        }

        await channel.send({
            content: '<@&' + roleID + '>',
            embeds: [
                new MessageEmbed({
                    author: {
                        name: req.body.release?.author?.login || 'Unknown Author',
                        iconURL: req.body.release?.author?.avatar_url,
                        url: req.body.release?.author?.html_url,
                    },
                    title: req.body.repository?.full_name,
                    description,
                    color: embedColor.blue,
                }),
            ],
        });
    } else {
        // Generic Release Event
        await channel.send({
            content: '<@&' + roleID + '>',
            embeds: [
                new MessageEmbed({
                    author: {
                        name: 'A new release has been published!',
                        iconURL: embedIcon.info,
                    },
                    color: embedColor.blue,
                }),
            ],
        });
    }

    return 200;
}
