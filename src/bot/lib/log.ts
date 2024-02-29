import { ChannelType, EmbedBuilder } from 'discord.js';
import { client, settings } from '../bot.ts';
import { EmbedColor, EmbedIcon } from './embeds.ts';

export default function (content: string | EmbedBuilder, title?: string, files?: string[]) {
    const logChannel = client.channels.cache.get(settings.data.logging.moderationChannelID);
    if (logChannel?.type !== ChannelType.GuildText) return;

    if (content instanceof EmbedBuilder) {
        content.data.author ??= { name: 'Log', icon_url: EmbedIcon.Log };
        content.data.color ??= EmbedColor.Blue;

        return logChannel.send({ embeds: [content], files });
    } else {
        return logChannel.send({ embeds: [new EmbedBuilder({ author: { name: 'Log', iconURL: EmbedIcon.Log }, title, color: EmbedColor.Blue, description: content })], files });
    }
}
