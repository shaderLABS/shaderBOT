import { ChannelType, EmbedBuilder } from 'discord.js';
import { client, settings } from '../bot.js';
import { EmbedColor, EmbedIcon } from './embeds.js';

export default function (content: string | EmbedBuilder, title?: string) {
    const logChannel = client.channels.cache.get(settings.data.logging.moderationChannelID);
    if (logChannel?.type !== ChannelType.GuildText) return;

    if (content instanceof EmbedBuilder) {
        content.data.author ??= { name: 'Log', icon_url: EmbedIcon.Log };
        content.data.color ??= EmbedColor.Blue;

        return logChannel.send({ embeds: [content] });
    } else {
        return logChannel.send({ embeds: [new EmbedBuilder({ author: { name: 'Log', iconURL: EmbedIcon.Log }, title, color: EmbedColor.Blue, description: content })] });
    }
}
