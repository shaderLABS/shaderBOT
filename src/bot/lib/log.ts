import { MessageEmbed, TextChannel } from 'discord.js';
import { settings } from '../bot.js';
import { embedColor, embedIcon } from './embeds.js';
import { getGuild } from './misc.js';

export default function (content: string | MessageEmbed, title?: string) {
    const guild = getGuild();
    if (!guild) return;

    const logChannel = guild.channels.cache.get(settings.logging.channelID);
    if (logChannel instanceof TextChannel) {
        if (content instanceof MessageEmbed) return logChannel.send({ embeds: [content] });
        else return logChannel.send({ embeds: [new MessageEmbed({ author: { name: 'Log', iconURL: embedIcon.log }, title, color: embedColor.blue, description: content })] });
    }
}
