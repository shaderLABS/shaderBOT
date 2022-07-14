import {
    ActionRowBuilder,
    ApplicationCommandType,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    CommandInteraction,
    EmbedBuilder,
    GuildMember,
    InteractionType,
    ModalSubmitInteraction,
    PermissionFlagsBits,
    TextBasedChannel,
    User,
} from 'discord.js';
import { GuildCommandInteraction } from '../slashCommandHandler.js';

export const enum EmbedColor {
    Green = 0x4caf50,
    Red = 0xf44336,
    Blue = 0x2196f3,
    Yellow = 0xffc107,
}

export const enum EmbedIcon {
    Success = 'https://img.icons8.com/color/48/000000/ok--v1.png',
    Error = 'https://img.icons8.com/color/48/000000/cancel--v1.png',
    Info = 'https://img.icons8.com/color/48/000000/info--v1.png',
    Log = 'https://img.icons8.com/officexs/48/000000/clock.png',
    Note = 'https://img.icons8.com/color/48/000000/note.png',
}

function getInteractionName(interaction: CommandInteraction | ButtonInteraction | ModalSubmitInteraction) {
    if (interaction.type === InteractionType.ApplicationCommand) {
        if (interaction.commandType === ApplicationCommandType.ChatInput) return '/' + interaction.commandName;
        return interaction.commandName;
    }

    return 'Unknown Interaction';
}

export function sendSuccess(channel: TextBasedChannel | User | GuildMember, description: any, title?: string) {
    const embed = new EmbedBuilder({
        author: { name: title || 'Success', iconURL: EmbedIcon.Success },
        description,
        color: EmbedColor.Green,
    });

    return channel.send({ embeds: [embed] });
}

export function replySuccess(interaction: CommandInteraction | ButtonInteraction | ModalSubmitInteraction, description: any, title?: string, ephemeral: boolean | undefined = false) {
    const embed = new EmbedBuilder({
        author: { name: title || 'Success', iconURL: EmbedIcon.Success },
        description,
        color: EmbedColor.Green,
    });

    return (interaction.deferred ? interaction.editReply({ embeds: [embed] }) : interaction.reply({ embeds: [embed], ephemeral })).catch(() =>
        interaction.channel?.send({
            embeds: [
                embed.setFooter({
                    iconURL: interaction.user.displayAvatarURL(),
                    text: `${interaction.user.tag} (${interaction.user.id}) used ${getInteractionName(interaction)}`,
                }),
            ],
        })
    );
}

export function sendError(channel: TextBasedChannel | User | GuildMember, description: any, title?: string) {
    const embed = new EmbedBuilder({
        author: { name: title || 'Error', iconURL: EmbedIcon.Error },
        description,
        color: EmbedColor.Red,
    });

    return channel.send({ embeds: [embed] });
}

export function replyError(interaction: CommandInteraction | ButtonInteraction | ModalSubmitInteraction, description: any, title?: string, ephemeral: boolean | undefined = true) {
    const embed = new EmbedBuilder({
        author: { name: title || 'Error', iconURL: EmbedIcon.Error },
        description,
        color: EmbedColor.Red,
    });

    return (interaction.deferred ? interaction.editReply({ embeds: [embed] }) : interaction.reply({ embeds: [embed], ephemeral })).catch(() =>
        interaction.channel?.send({
            embeds: [
                embed.setFooter({
                    iconURL: interaction.user.displayAvatarURL(),
                    text: `${interaction.user.tag} (${interaction.user.id}) used ${getInteractionName(interaction)}`,
                }),
            ],
        })
    );
}

export function sendInfo(channel: TextBasedChannel | User | GuildMember, description: any, title?: string, message?: string, footer?: string) {
    const embed = new EmbedBuilder({
        author: title ? { name: title, iconURL: EmbedIcon.Info } : undefined,
        description,
        color: EmbedColor.Blue,
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
        author: title ? { name: title, iconURL: EmbedIcon.Info } : undefined,
        description,
        color: EmbedColor.Blue,
        footer: footer ? { text: footer } : undefined,
    });

    return (interaction.deferred ? interaction.editReply({ content: message, embeds: [embed] }) : interaction.reply({ content: message, embeds: [embed], ephemeral })).catch(() =>
        interaction.channel?.send({
            embeds: [
                embed.setFooter({
                    iconURL: interaction.user.displayAvatarURL(),
                    text: `${footer ? footer + '\n' : ''}${interaction.user.tag} (${interaction.user.id}) used ${getInteractionName(interaction)}`,
                }),
            ],
        })
    );
}

export async function sendButtonPages(
    channel: TextBasedChannel | User | GuildMember,
    authorID: string,
    pages: string[],
    title: string,
    color: number = EmbedColor.Blue,
    iconURL: string = EmbedIcon.Info
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

    if (!message.inGuild()) return;

    const collector = message.createMessageComponentCollector({
        filter: (buttonInteraction) => buttonInteraction.user.id === authorID || buttonInteraction.member.permissions.has(PermissionFlagsBits.ManageMessages),
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

export async function replyButtonPages(interaction: GuildCommandInteraction, pages: string[], title: string, color: number = EmbedColor.Blue, iconURL: string = EmbedIcon.Info) {
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
    if (!message.inGuild()) return;

    const collector = message.createMessageComponentCollector({
        filter: (buttonInteraction) => buttonInteraction.user.id === interaction.user.id || buttonInteraction.member.permissions.has(PermissionFlagsBits.ManageMessages),
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
