import cfg from '../../cfg.json';
import { TextChannel, MessageEmbed, Guild } from 'discord.js';

export function log(guild: Guild, content: string) {
    const logChannel = guild.channels.cache.get(cfg.logChannelID);
    if (logChannel instanceof TextChannel)
        logChannel.send('', new MessageEmbed().setAuthor('LOG').setColor('#0f0').setDescription(content));
}
