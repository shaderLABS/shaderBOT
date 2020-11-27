import { client, settings } from '../bot.js';
import { TextChannel, MessageEmbed } from 'discord.js';

export default function (content: string | MessageEmbed, title?: string) {
    const guild = client.guilds.cache.first();
    if (!guild) return;

    const logChannel = guild.channels.cache.get(settings.logging.channelID);
    if (logChannel instanceof TextChannel) {
        if (content instanceof MessageEmbed) logChannel.send(content);
        else
            logChannel.send(
                new MessageEmbed().setAuthor('LOG', 'https://img.icons8.com/officexs/48/000000/clock.png').setTitle(title).setColor('#006fff').setDescription(content)
            );
    }
}
