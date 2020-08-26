import { client, settings } from '../bot/bot.js';
import { TextChannel, MessageEmbed } from 'discord.js';

export default function (content: string) {
    const guild = client.guilds.cache.first();
    if (!guild) return;

    const logChannel = guild.channels.cache.get(settings.logging.channelID);
    if (logChannel instanceof TextChannel)
        logChannel.send(
            new MessageEmbed()
                .setAuthor('LOG', 'https://img.icons8.com/officexs/48/000000/clock.png')
                .setColor('#006fff')
                .setDescription(content)
        );
}
