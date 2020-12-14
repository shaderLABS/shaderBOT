import { settings } from '../bot.js';
import { TextChannel, MessageEmbed } from 'discord.js';
import { getGuild } from './misc.js';

export default function (content: string | MessageEmbed, title?: string) {
    const guild = getGuild();
    if (!guild) return;

    const logChannel = guild.channels.cache.get(settings.logging.channelID);
    if (logChannel instanceof TextChannel) {
        if (content instanceof MessageEmbed) logChannel.send(content);
        else
            logChannel.send(
                new MessageEmbed({ author: { name: 'LOG', iconURL: 'https://img.icons8.com/officexs/48/000000/clock.png' }, title, color: '#006fff', description: content })
            );
    }
}
