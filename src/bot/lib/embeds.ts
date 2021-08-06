import { DMChannel, Message, MessageEmbed, NewsChannel, TextChannel, User } from 'discord.js';

export const embedColor = {
    green: '#4caf50',
    red: '#f44336',
    blue: '#2196f3',
};

export const embedIcon = {
    success: 'https://img.icons8.com/color/48/000000/ok--v1.png',
    error: 'https://img.icons8.com/color/48/000000/cancel--v1.png',
    info: 'https://img.icons8.com/color/48/000000/info--v1.png',
    log: 'https://img.icons8.com/officexs/48/000000/clock.png',
    note: 'https://img.icons8.com/color/48/000000/note.png',
};

export function sendSuccess(channel: TextChannel | DMChannel | NewsChannel, description: string, title?: string) {
    const embed = new MessageEmbed()
        .setAuthor(title || 'Success', embedIcon.success)
        .setDescription(description)
        .setColor(embedColor.green);
    return channel.send({ embeds: [embed] });
}

export function sendError(channel: TextChannel | DMChannel | NewsChannel, description: string, title?: string) {
    const embed = new MessageEmbed()
        .setAuthor(title || 'Error', embedIcon.error)
        .setDescription(description)
        .setColor(embedColor.red);
    return channel.send({ embeds: [embed] });
}

export function sendInfo(channel: TextChannel | DMChannel | NewsChannel, description: string, title?: string, message?: string, footer?: string) {
    const embed = new MessageEmbed()
        .setAuthor(title || '', title ? embedIcon.info : undefined)
        .setDescription(description)
        .setColor(embedColor.blue)
        .setFooter(footer || '');
    return channel.send({ content: message, embeds: [embed] });
}

export async function embedPages(message: Message, author: User, pages: string[]) {
    const embed = message.embeds[0];
    if (!embed || pages.length <= 1) return;

    message.react('➡️');
    const collector = message.createReactionCollector((reaction, user) => !!reaction.emoji.name && ['⬅️', '➡️'].includes(reaction.emoji.name) && user.id === author.id, { idle: 300000, time: 600000 });

    let index = 0;
    collector.on('collect', async (reaction) => {
        if (reaction.emoji.name === '⬅️' && pages[index - 1]) index--;
        else if (reaction.emoji.name === '➡️' && pages[index + 1]) index++;
        else return;

        await message.reactions.removeAll();
        // if (pageFooter) embed.setFooter(`Page ${index + 1}/${pages.length}`);
        message.edit({ embeds: [embed.setDescription(pages[index])] });

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
    const collector = message.createReactionCollector((reaction, user) => !!reaction.emoji.name && ['⬅️', '➡️'].includes(reaction.emoji.name) && user.id === author.id, { idle: 300000, time: 600000 });

    let index = 0;
    collector.on('collect', async (reaction) => {
        if (reaction.emoji.name === '⬅️' && fields[index - 1]) index--;
        else if (reaction.emoji.name === '➡️' && fields[index + 1]) index++;
        else return;

        await message.reactions.removeAll();

        embed.fields = fields[index];
        message.edit({ embeds: [embed] });

        if (index !== 0) message.react('⬅️');
        if (index + 1 < fields.length) message.react('➡️');
    });

    collector.on('end', () => {
        message.reactions.removeAll();
    });
}
