import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    CommandInteraction,
    DMChannel,
    EmbedBuilder,
    GuildMember,
    Message,
    ModalSubmitInteraction,
    PermissionFlagsBits,
    TextChannel,
    ThreadChannel,
    User,
} from 'discord.js';
import { GuildCommandInteraction } from '../slashCommandHandler.js';

export const embedColor = {
    green: 0x4caf50,
    red: 0xf44336,
    blue: 0x2196f3,
    yellow: 0xffc107,
};

export const embedIcon = {
    success: 'https://img.icons8.com/color/48/000000/ok--v1.png',
    error: 'https://img.icons8.com/color/48/000000/cancel--v1.png',
    info: 'https://img.icons8.com/color/48/000000/info--v1.png',
    log: 'https://img.icons8.com/officexs/48/000000/clock.png',
    note: 'https://img.icons8.com/color/48/000000/note.png',
};

export function sendSuccess(channel: TextChannel | DMChannel | ThreadChannel | User | GuildMember, description: any, title?: string) {
    const embed = new EmbedBuilder({
        author: { name: title || 'Success', iconURL: embedIcon.success },
        description,
        color: embedColor.green,
    });

    return channel.send({ embeds: [embed] });
}

export function replySuccess(interaction: CommandInteraction | ButtonInteraction | ModalSubmitInteraction, description: any, title?: string, ephemeral: boolean | undefined = false) {
    const embed = new EmbedBuilder({
        author: { name: title || 'Success', iconURL: embedIcon.success },
        description,
        color: embedColor.green,
    });

    return (interaction.deferred ? interaction.editReply({ embeds: [embed] }) : interaction.reply({ embeds: [embed], ephemeral })).catch(() =>
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

export function sendError(channel: TextChannel | DMChannel | ThreadChannel | User | GuildMember, description: any, title?: string) {
    const embed = new EmbedBuilder({
        author: { name: title || 'Error', iconURL: embedIcon.error },
        description,
        color: embedColor.red,
    });

    return channel.send({ embeds: [embed] });
}

export function replyError(interaction: CommandInteraction | ButtonInteraction | ModalSubmitInteraction, description: any, title?: string, ephemeral: boolean | undefined = true) {
    const embed = new EmbedBuilder({
        author: { name: title || 'Error', iconURL: embedIcon.error },
        description,
        color: embedColor.red,
    });

    return (interaction.deferred ? interaction.editReply({ embeds: [embed] }) : interaction.reply({ embeds: [embed], ephemeral })).catch(() =>
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

export function sendInfo(channel: TextChannel | DMChannel | ThreadChannel | User | GuildMember, description: any, title?: string, message?: string, footer?: string) {
    const embed = new EmbedBuilder({
        author: title ? { name: title, iconURL: embedIcon.info } : undefined,
        description,
        color: embedColor.blue,
        footer: footer ? { text: footer } : undefined,
    });

    return channel.send({ content: message, embeds: [embed] });
}

export function replyInfo(
    interaction: CommandInteraction | ButtonInteraction | ModalSubmitInteraction,
    description: any,
    title?: string,
    message?: string,
    footer?: string,
    ephemeral: boolean | undefined = false
) {
    const embed = new EmbedBuilder({
        author: title ? { name: title, iconURL: embedIcon.info } : undefined,
        description,
        color: embedColor.blue,
        footer: footer ? { text: footer } : undefined,
    });

    return (interaction.deferred ? interaction.editReply({ content: message, embeds: [embed] }) : interaction.reply({ content: message, embeds: [embed], ephemeral })).catch(() =>
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
    channel: TextChannel | ThreadChannel | User | GuildMember,
    authorID: string,
    pages: string[],
    title: string,
    color: number = embedColor.blue,
    iconURL: string = embedIcon.info
) {
    const embed = new EmbedBuilder({
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

    const backwardButton = new ButtonBuilder({
        customId: 'backward',
        style: ButtonStyle.Secondary,
        emoji: { name: '⬅️' },
        disabled: true,
    });

    const forwardButton = new ButtonBuilder({
        customId: 'forward',
        style: ButtonStyle.Secondary,
        emoji: { name: '➡️' },
    });

    const message = await channel.send({
        embeds: [embed],
        components: [
            new ActionRowBuilder<ButtonBuilder>({
                components: [backwardButton, forwardButton],
            }),
        ],
    });

    const collector = message.createMessageComponentCollector({
        filter: (buttonInteraction) =>
            buttonInteraction.user.id === authorID || (buttonInteraction.member instanceof GuildMember && buttonInteraction.member.permissions.has(PermissionFlagsBits.ManageMessages)),
        idle: 600000,
    });

    let index = 0;
    collector.on('collect', async (buttonInteraction) => {
        if (buttonInteraction.customId === 'backward') {
            const content = pages[index - 1];
            if (!content) return;

            --index;
            await message.edit({ embeds: [embed.setDescription(content)] });
        } else if (buttonInteraction.customId === 'forward') {
            const content = pages[index + 1];
            if (!content) return;

            ++index;
            await message.edit({ embeds: [embed.setDescription(content)] });
        }

        buttonInteraction.update({ components: [new ActionRowBuilder<ButtonBuilder>({ components: [backwardButton.setDisabled(!pages[index - 1]), forwardButton.setDisabled(!pages[index + 1])] })] });
    });

    collector.on('end', () => {
        message.edit({ components: [] });
    });
}

export async function replyButtonPages(interaction: GuildCommandInteraction, pages: string[], title: string, color: number = embedColor.blue, iconURL: string = embedIcon.info) {
    const embed = new EmbedBuilder({
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

    const backwardButton = new ButtonBuilder({
        customId: 'backward',
        style: ButtonStyle.Secondary,
        emoji: { name: '⬅️' },
        disabled: true,
    });

    const forwardButton = new ButtonBuilder({
        customId: 'forward',
        style: ButtonStyle.Secondary,
        emoji: { name: '➡️' },
    });

    await interaction.reply({
        embeds: [embed],
        components: [
            new ActionRowBuilder<ButtonBuilder>({
                components: [backwardButton, forwardButton],
            }),
        ],
    });

    const message = await interaction.fetchReply();
    if (!(message instanceof Message)) return;

    const collector = message.createMessageComponentCollector({
        filter: (buttonInteraction) =>
            buttonInteraction.user.id === interaction.user.id || (buttonInteraction.member instanceof GuildMember && buttonInteraction.member.permissions.has(PermissionFlagsBits.ManageMessages)),
        idle: 600000,
    });

    let index = 0;
    collector.on('collect', async (buttonInteraction) => {
        if (buttonInteraction.customId === 'backward') {
            const content = pages[index - 1];
            if (!content) return;

            --index;
            await message.edit({ embeds: [embed.setDescription(content)] });
        } else if (buttonInteraction.customId === 'forward') {
            const content = pages[index + 1];
            if (!content) return;

            ++index;
            await message.edit({ embeds: [embed.setDescription(content)] });
        }

        buttonInteraction.update({ components: [new ActionRowBuilder<ButtonBuilder>({ components: [backwardButton.setDisabled(!pages[index - 1]), forwardButton.setDisabled(!pages[index + 1])] })] });
    });

    collector.on('end', () => {
        interaction.editReply({ components: [] });
    });
}
