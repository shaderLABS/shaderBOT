import { TextChannel, MessageEmbed, DMChannel, NewsChannel } from 'discord.js';

export async function sendSuccess(channel: TextChannel | DMChannel | NewsChannel, description: string, title?: string) {
    const embed = new MessageEmbed()
        .setAuthor(title || 'SUCCESS', 'https://img.icons8.com/color/48/000000/ok--v1.png')
        .setDescription(description)
        .setColor('#00ff11');
    return await channel.send(embed);
}

export async function sendError(channel: TextChannel | DMChannel | NewsChannel, description: string, title?: string) {
    const embed = new MessageEmbed()
        .setAuthor(title || 'ERROR', 'https://img.icons8.com/color/48/000000/cancel--v1.png')
        .setDescription(description)
        .setColor('#ff1100');
    return await channel.send(embed);
}

export async function sendInfo(channel: TextChannel | DMChannel | NewsChannel, description: string, title?: string) {
    const embed = new MessageEmbed()
        .setAuthor(title || '', title ? 'https://img.icons8.com/color/48/000000/info--v1.png' : undefined)
        .setDescription(description)
        .setColor('#006fff');
    return await channel.send(embed);
}
