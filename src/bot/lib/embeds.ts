import {
    ButtonInteraction,
    ColorResolvable,
    CommandInteraction,
    DMChannel,
    GuildMember,
    Message,
    MessageActionRow,
    MessageButton,
    MessageEmbed,
    Permissions,
    TextChannel,
    ThreadChannel,
    User,
} from 'discord.js';
import { GuildCommandInteraction } from '../events/interactionCreate';

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
        .setAuthor({ name: title || 'Success', iconURL: embedIcon.success })
        .setDescription(description)
        .setColor(embedColor.green);
    return channel.send({ embeds: [embed] });
}

export function replySuccess(interaction: CommandInteraction | ButtonInteraction, description: any, title?: string, ephemeral: boolean | undefined = false) {
    const embed = new MessageEmbed()
        .setAuthor({ name: title || 'Success', iconURL: embedIcon.success })
        .setDescription(description)
        .setColor(embedColor.green);

    return interaction.reply({ embeds: [embed], ephemeral }).catch(() =>
        interaction.channel?.send({
            embeds: [
                embed.setFooter({
                    iconURL: interaction.user.displayAvatarURL(),
                    text: `${interaction.user.tag} (${interaction.user.id}) used ${interaction.isCommand() ? '/' + interaction.commandName : 'Unknown Interaction'}`,
                }),
            ],
        })
    );
}

export function sendError(channel: TextChannel | DMChannel | ThreadChannel, description: any, title?: string) {
    const embed = new MessageEmbed()
        .setAuthor({ name: title || 'Error', iconURL: embedIcon.error })
        .setDescription(description)
        .setColor(embedColor.red);
    return channel.send({ embeds: [embed] });
}

export function replyError(interaction: CommandInteraction | ButtonInteraction, description: any, title?: string, ephemeral: boolean | undefined = true) {
    const embed = new MessageEmbed()
        .setAuthor({ name: title || 'Error', iconURL: embedIcon.error })
        .setDescription(description)
        .setColor(embedColor.red);

    return interaction.reply({ embeds: [embed], ephemeral }).catch(() =>
        interaction.channel?.send({
            embeds: [
                embed.setFooter({
                    iconURL: interaction.user.displayAvatarURL(),
                    text: `${interaction.user.tag} (${interaction.user.id}) used ${interaction.isCommand() ? '/' + interaction.commandName : 'Unknown Interaction'}`,
                }),
            ],
        })
    );
}

export function sendInfo(channel: TextChannel | DMChannel | ThreadChannel, description: any, title?: string, message?: string, footer?: string) {
    const embed = new MessageEmbed()
        .setAuthor({ name: title || '', iconURL: title ? embedIcon.info : undefined })
        .setDescription(description)
        .setColor(embedColor.blue)
        .setFooter({ text: footer || '' });
    return channel.send({ content: message, embeds: [embed] });
}

export function replyInfo(interaction: CommandInteraction | ButtonInteraction, description: any, title?: string, message?: string, footer?: string, ephemeral: boolean | undefined = false) {
    const embed = new MessageEmbed()
        .setAuthor({ name: title || '', iconURL: title ? embedIcon.info : undefined })
        .setDescription(description)
        .setColor(embedColor.blue)
        .setFooter({ text: footer || '' });

    return interaction.reply({ content: message, embeds: [embed], ephemeral }).catch(() =>
        interaction.channel?.send({
            embeds: [
                embed.setFooter({
                    iconURL: interaction.user.displayAvatarURL(),
                    text: `${footer ? footer + '\n' : ''}${interaction.user.tag} (${interaction.user.id}) used ${interaction.isCommand() ? '/' + interaction.commandName : 'Unknown Interaction'}`,
                }),
            ],
        })
    );
}

export async function sendButtonPages(
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

export async function replyButtonPages(interaction: GuildCommandInteraction, pages: string[], title?: string, color: ColorResolvable = embedColor.blue, iconURL: string = embedIcon.info) {
    const embed = new MessageEmbed({
        color,
        description: pages[0],
        author: {
            name: title,
            iconURL,
        },
    });

    if (pages.length <= 1) {
        interaction.reply({ embeds: [embed] });
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

    await interaction.reply({
        embeds: [embed],
        components: [
            new MessageActionRow({
                components: [backwardButton, forwardButton],
            }),
        ],
    });

    const message = await interaction.fetchReply();
    if (!(message instanceof Message)) return;

    const collector = message.createMessageComponentCollector({
        // TODO: handle APIInteractionGuildMember if there are any issues
        filter: (buttonInteraction) =>
            buttonInteraction.user.id === interaction.user.id || (buttonInteraction.member instanceof GuildMember && buttonInteraction.member.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES)),
        idle: 600000,
    });

    let index = 0;
    collector.on('collect', async (buttonInteraction) => {
        if (buttonInteraction.customId === 'backward') {
            await interaction.editReply({ embeds: [embed.setDescription(pages[--index])] });
        } else if (buttonInteraction.customId === 'forward') {
            await interaction.editReply({ embeds: [embed.setDescription(pages[++index])] });
        }

        buttonInteraction.update({ components: [new MessageActionRow({ components: [backwardButton.setDisabled(!pages[index - 1]), forwardButton.setDisabled(!pages[index + 1])] })] });
    });

    collector.on('end', () => {
        interaction.editReply({ components: [] });
    });
}
