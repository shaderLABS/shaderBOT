import { TextChannel, MessageEmbed, DMChannel, NewsChannel, Message, User } from 'discord.js';

export async function sendSuccess(channel: TextChannel | DMChannel | NewsChannel, description: string, title?: string) {
    const embed = new MessageEmbed()
        .setAuthor(title || 'Success', 'https://img.icons8.com/color/48/000000/ok--v1.png')
        .setDescription(description)
        .setColor('#00ff11');
    return await channel.send(embed);
}

export async function sendError(channel: TextChannel | DMChannel | NewsChannel, description: string, title?: string) {
    const embed = new MessageEmbed()
        .setAuthor(title || 'Error', 'https://img.icons8.com/color/48/000000/cancel--v1.png')
        .setDescription(description)
        .setColor('#ff1100');
    return await channel.send(embed);
}

export async function sendInfo(channel: TextChannel | DMChannel | NewsChannel, description: string, title?: string, message?: string) {
    const embed = new MessageEmbed()
        .setAuthor(title || '', title ? 'https://img.icons8.com/color/48/000000/info--v1.png' : undefined)
        .setDescription(description)
        .setColor('#006fff');
    return await channel.send(message, embed);
}

export async function embedPages(message: Message, author: User, pages: string[]) {
    const embed = message.embeds[0];
    if (!embed || pages.length <= 1) return;

    message.react('➡️');
    const collector = message.createReactionCollector((reaction, user) => ['⬅️', '➡️'].includes(reaction.emoji.name) && user.id === author.id, { idle: 60000, time: 240000 });

    let index = 0;
    collector.on('collect', async (reaction) => {
        if (reaction.emoji.name === '⬅️' && pages[index - 1]) index--;
        else if (reaction.emoji.name === '➡️' && pages[index + 1]) index++;
        else return;

        await message.reactions.removeAll();
        // if (pageFooter) embed.setFooter(`Page ${index + 1}/${pages.length}`);
        message.edit(embed.setDescription(pages[index]));

        if (index !== 0) message.react('⬅️');
        if (index + 1 < pages.length) message.react('➡️');
    });

    collector.on('end', () => {
        message.reactions.removeAll();
    });
}

export async function embedFields(message: Message, author: User, fields: { name: string; value: string; inline: boolean }[][]) {
    const embed = message.embeds[0];
    if (!embed || fields.length <= 1) return;

    message.react('➡️');
    const collector = message.createReactionCollector((reaction, user) => ['⬅️', '➡️'].includes(reaction.emoji.name) && user.id === author.id, { idle: 60000, time: 240000 });

    let index = 0;
    collector.on('collect', async (reaction) => {
        if (reaction.emoji.name === '⬅️' && fields[index - 1]) index--;
        else if (reaction.emoji.name === '➡️' && fields[index + 1]) index++;
        else return;

        await message.reactions.removeAll();

        embed.fields = fields[index];
        message.edit(embed);

        if (index !== 0) message.react('⬅️');
        if (index + 1 < fields.length) message.react('➡️');
    });

    collector.on('end', () => {
        message.reactions.removeAll();
    });
}
