import { ColorResolvable, DMChannel, GuildMember, MessageActionRow, MessageButton, MessageEmbed, Permissions, TextChannel, ThreadChannel, User } from 'discord.js';

export const embedColor = {
    green: 0x4caf50,
    red: 0xf44336,
    blue: 0x2196f3,
};

export const embedIcon = {
    success: 'https://img.icons8.com/color/48/000000/ok--v1.png',
    error: 'https://img.icons8.com/color/48/000000/cancel--v1.png',
    info: 'https://img.icons8.com/color/48/000000/info--v1.png',
    log: 'https://img.icons8.com/officexs/48/000000/clock.png',
    note: 'https://img.icons8.com/color/48/000000/note.png',
};

export function sendSuccess(channel: TextChannel | DMChannel | ThreadChannel, description: any, title?: string) {
    const embed = new MessageEmbed()
        .setAuthor(title || 'Success', embedIcon.success)
        .setDescription(description)
        .setColor(embedColor.green);
    return channel.send({ embeds: [embed] });
}

export function sendError(channel: TextChannel | DMChannel | ThreadChannel, description: any, title?: string) {
    const embed = new MessageEmbed()
        .setAuthor(title || 'Error', embedIcon.error)
        .setDescription(description)
        .setColor(embedColor.red);
    return channel.send({ embeds: [embed] });
}

export function sendInfo(channel: TextChannel | DMChannel | ThreadChannel, description: any, title?: string, message?: string, footer?: string) {
    const embed = new MessageEmbed()
        .setAuthor(title || '', title ? embedIcon.info : undefined)
        .setDescription(description)
        .setColor(embedColor.blue)
        .setFooter(footer || '');
    return channel.send({ content: message, embeds: [embed] });
}

export async function embedButtonPages(
    channel: TextChannel | ThreadChannel | DMChannel,
    author: User,
    pages: string[],
    title?: string,
    color: ColorResolvable = embedColor.blue,
    iconURL: string = embedIcon.info
) {
    const embed = new MessageEmbed({
        color,
        description: pages[0],
        author: {
            name: title,
            iconURL,
        },
    });

    if (pages.length <= 1) {
        channel.send({ embeds: [embed] });
        return;
    }

    const backwardButton = new MessageButton({
        customId: 'backward',
        style: 'SECONDARY',
        emoji: '⬅️',
        disabled: true,
    });

    const forwardButton = new MessageButton({
        customId: 'forward',
        style: 'SECONDARY',
        emoji: '➡️',
    });

    const message = await channel.send({
        embeds: [embed],
        components: [
            new MessageActionRow({
                components: [backwardButton, forwardButton],
            }),
        ],
    });

    const collector = message.createMessageComponentCollector({
        // TODO: handle APIInteractionGuildMember if there are any issues
        filter: (interaction) => interaction.user.id === author.id || (interaction.member instanceof GuildMember && interaction.member.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES)),
        idle: 600000,
    });

    let index = 0;
    collector.on('collect', async (interaction) => {
        if (interaction.customId === 'backward') {
            await message.edit({ embeds: [embed.setDescription(pages[--index])] });
        } else if (interaction.customId === 'forward') {
            await message.edit({ embeds: [embed.setDescription(pages[++index])] });
        }

        interaction.update({ components: [new MessageActionRow({ components: [backwardButton.setDisabled(!pages[index - 1]), forwardButton.setDisabled(!pages[index + 1])] })] });
    });

    collector.on('end', () => {
        message.edit({ components: [] });
    });
}
