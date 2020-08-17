import { settings } from './bot.js';
import { TextChannel, MessageEmbed, Guild } from 'discord.js';

export function log(guild: Guild, content: string) {
    const logChannel = guild.channels.cache.get(settings.logChannelID);
    if (logChannel instanceof TextChannel)
        logChannel.send('', new MessageEmbed().setAuthor('LOG').setColor('#00ff00').setDescription(content));
}
