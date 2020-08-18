import { client, settings } from '../bot/bot.js';
import { TextChannel, MessageEmbed } from 'discord.js';

export default function (content: string) {
    const guild = client.guilds.cache.first();
    if (!guild) return;

    const logChannel = guild.channels.cache.get(settings.logChannelID);
    if (logChannel instanceof TextChannel)
        logChannel.send('', new MessageEmbed().setAuthor('LOG').setColor('#00ff00').setDescription(content));
}
