import { ChannelType, EmbedBuilder } from 'discord.js';
import { settings } from '../bot.js';
import { EmbedColor, EmbedIcon } from './embeds.js';
import { getGuild } from './misc.js';

export default function (content: string | EmbedBuilder, title?: string) {
    const guild = getGuild();
    if (!guild) return;

    const logChannel = guild.channels.cache.get(settings.data.logging.moderationChannelID);
    if (logChannel?.type !== ChannelType.GuildText) return;

    if (content instanceof EmbedBuilder) return logChannel.send({ embeds: [content] });
    else return logChannel.send({ embeds: [new EmbedBuilder({ author: { name: 'Log', iconURL: EmbedIcon.log }, title, color: EmbedColor.blue, description: content })] });
}
