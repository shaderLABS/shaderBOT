import {
    type APIEmbedField,
    ActionRowBuilder,
    type AnySelectMenuInteraction,
    ApplicationCommandType,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    type CacheType,
    ChatInputCommandInteraction,
    CommandInteraction,
    ComponentType,
    EmbedBuilder,
    GuildMember,
    InteractionType,
    MessageContextMenuCommandInteraction,
    MessageFlags,
    ModalSubmitInteraction,
    PermissionFlagsBits,
    type SendableChannels,
    User,
    UserContextMenuCommandInteraction,
} from 'discord.js';

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

type ApplicationCommandInteraction<Cached extends CacheType = CacheType> =
    | ChatInputCommandInteraction<Cached>
    | MessageContextMenuCommandInteraction<Cached>
    | UserContextMenuCommandInteraction<Cached>;

function chatInputApplicationCommandMention(interaction: ChatInputCommandInteraction) {
    const subcommandGroupName = interaction.options.getSubcommandGroup(false);
    const subcommandName = interaction.options.getSubcommand(false);

    let string = '/' + interaction.commandName;
    if (subcommandGroupName) string += ' ' + subcommandGroupName;
    if (subcommandName) string += ' ' + subcommandName;

    return string;
}

function getInteractionName(interaction: ApplicationCommandInteraction | ButtonInteraction | ModalSubmitInteraction | AnySelectMenuInteraction) {
    if (interaction.type === InteractionType.ApplicationCommand) {
        if (interaction.commandType === ApplicationCommandType.ChatInput) return chatInputApplicationCommandMention(interaction);
        return interaction.commandName;
    }

    return 'Unknown Interaction';
}

export function sendSuccess(
    channel: SendableChannels | User | GuildMember,
    content: {
        title?: string;
        description?: string;
    },
) {
    const embed = new EmbedBuilder({
        author: { name: content.title || 'Success', iconURL: EmbedIcon.Success },
        description: content.description,
        color: EmbedColor.Green,
    });

    return channel.send({ embeds: [embed] });
}

export async function replySuccess(
    interaction: ApplicationCommandInteraction | ButtonInteraction | ModalSubmitInteraction | AnySelectMenuInteraction,
    content: {
        title?: string;
        description?: string;
    },
    ephemeral: boolean = false,
): Promise<void> {
    const flags = ephemeral ? MessageFlags.Ephemeral : undefined;

    const embed = new EmbedBuilder({
        author: { name: content.title || 'Success', iconURL: EmbedIcon.Success },
        description: content.description,
        color: EmbedColor.Green,
    });

    try {
        if (interaction.deferred) {
            await interaction.editReply({ embeds: [embed] });
        } else {
            await interaction.reply({ embeds: [embed], flags });
        }
    } catch {
        if (!interaction.channel?.isSendable()) return Promise.reject('Unable to send fallback message.');

        await interaction.channel.send({
            embeds: [
                embed.setFooter({
                    iconURL: interaction.user.displayAvatarURL(),
                    text: `${interaction.user.username} (${interaction.user.id}) used ${getInteractionName(interaction)}`,
                }),
            ],
        });
    }
}

export function sendError(
    channel: SendableChannels | User | GuildMember,
    content: {
        title?: string;
        description?: string;
    },
) {
    const embed = new EmbedBuilder({
        author: { name: content.title || 'Error', iconURL: EmbedIcon.Error },
        description: content.description,
        color: EmbedColor.Red,
    });

    return channel.send({ embeds: [embed] });
}

export async function replyError(
    interaction: ApplicationCommandInteraction | ButtonInteraction | ModalSubmitInteraction | AnySelectMenuInteraction,
    content: {
        title?: string;
        description?: string;
    },
    ephemeral: boolean = true,
): Promise<void> {
    const flags = ephemeral ? MessageFlags.Ephemeral : undefined;

    const embed = new EmbedBuilder({
        author: { name: content.title || 'Error', iconURL: EmbedIcon.Error },
        description: content.description,
        color: EmbedColor.Red,
    });

    try {
        if (interaction.deferred) {
            await interaction.editReply({ embeds: [embed] });
        } else {
            await interaction.reply({ embeds: [embed], flags });
        }
    } catch {
        if (!interaction.channel?.isSendable()) return Promise.reject('Unable to send fallback message.');

        await interaction.channel.send({
            embeds: [
                embed.setFooter({
                    iconURL: interaction.user.displayAvatarURL(),
                    text: `${interaction.user.username} (${interaction.user.id}) used ${getInteractionName(interaction)}`,
                }),
            ],
        });
    }
}

export function sendInfo(
    channel: SendableChannels | User | GuildMember,
    content: {
        title?: string;
        description?: string;
        message?: string;
        footer?: string;
    },
) {
    const embed = new EmbedBuilder({
        author: content.title ? { name: content.title, iconURL: EmbedIcon.Info } : undefined,
        description: content.description,
        color: EmbedColor.Blue,
        footer: content.footer ? { text: content.footer } : undefined,
    });

    return channel.send({ content: content.message, embeds: [embed] });
}

export async function replyInfo(
    interaction: ApplicationCommandInteraction | ButtonInteraction | ModalSubmitInteraction | AnySelectMenuInteraction,
    content: {
        title?: string;
        description?: string;
        message?: string;
        footer?: string;
    },
    ephemeral: boolean = false,
): Promise<void> {
    const flags = ephemeral ? MessageFlags.Ephemeral : undefined;

    const embed = new EmbedBuilder({
        author: content.title ? { name: content.title, iconURL: EmbedIcon.Info } : undefined,
        description: content.description,
        color: EmbedColor.Blue,
        footer: content.footer ? { text: content.footer } : undefined,
    });

    try {
        if (interaction.deferred) {
            await interaction.editReply({ content: content.message, embeds: [embed] });
        } else {
            await interaction.reply({ content: content.message, embeds: [embed], flags });
        }
    } catch {
        if (!interaction.channel?.isSendable()) return Promise.reject('Unable to send fallback message.');

        await interaction.channel.send({
            embeds: [
                embed.setFooter({
                    iconURL: interaction.user.displayAvatarURL(),
                    text: `${content.footer ? content.footer + '\n' : ''}${interaction.user.username} (${interaction.user.id}) used ${getInteractionName(interaction)}`,
                }),
            ],
        });
    }
}

export async function sendButtonPages(
    channel: SendableChannels | User | GuildMember,
    authorId: string,
    content: {
        title: string;
        pages: string[];
    },
) {
    const embed = new EmbedBuilder({
        color: EmbedColor.Blue,
        description: content.pages[0],
        author: {
            name: content.title,
            iconURL: EmbedIcon.Info,
        },
    });

    if (content.pages.length <= 1) {
        await channel.send({ embeds: [embed] });
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
        componentType: ComponentType.Button,
        filter: (buttonInteraction) => {
            if (buttonInteraction.user.id === authorId || (buttonInteraction.inCachedGuild() && buttonInteraction.member.permissions.has(PermissionFlagsBits.ManageMessages))) return true;

            replyError(buttonInteraction, { title: 'Insufficient Permissions' });
            return false;
        },
        idle: 600_000, // 10min = 600,000ms
    });

    let index = 0;
    collector.on('collect', async (buttonInteraction) => {
        if (buttonInteraction.customId === 'backward') {
            const page = content.pages[index - 1];
            if (!page) return;

            --index;
            await message.edit({ embeds: [embed.setDescription(page)] });
        } else if (buttonInteraction.customId === 'forward') {
            const page = content.pages[index + 1];
            if (!page) return;

            ++index;
            await message.edit({ embeds: [embed.setDescription(page)] });
        }

        buttonInteraction.update({
            components: [new ActionRowBuilder<ButtonBuilder>({ components: [backwardButton.setDisabled(!content.pages[index - 1]), forwardButton.setDisabled(!content.pages[index + 1])] })],
        });
    });

    collector.on('end', () => {
        message.edit({ components: [] }).catch(() => undefined);
    });
}

export async function replyButtonPages(
    interaction: CommandInteraction | ButtonInteraction | ModalSubmitInteraction | AnySelectMenuInteraction,
    content: {
        title: string;
        pages: string[];
        fields?: APIEmbedField[];
    },
    ephemeral: boolean = false,
) {
    const flags = ephemeral ? MessageFlags.Ephemeral : undefined;

    const embed = new EmbedBuilder({
        color: EmbedColor.Blue,
        description: content.pages[0],
        author: {
            name: content.title,
            iconURL: EmbedIcon.Info,
        },
        fields: content.fields,
    });

    if (content.pages.length <= 1) {
        await interaction.reply({ embeds: [embed], flags });
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

    const interactionResponse = await interaction.reply({
        embeds: [embed],
        components: [
            new ActionRowBuilder<ButtonBuilder>({
                components: [backwardButton, forwardButton],
            }),
        ],
        flags,
    });

    const collector = interactionResponse.createMessageComponentCollector({
        componentType: ComponentType.Button,
        filter: (buttonInteraction) => {
            if (buttonInteraction.user.id === interaction.user.id || (buttonInteraction.inCachedGuild() && buttonInteraction.member.permissions.has(PermissionFlagsBits.ManageMessages))) return true;

            replyError(buttonInteraction, { title: 'Insufficient Permissions' });
            return false;
        },
        idle: 600_000, // 10min = 600,000ms
    });

    let index = 0;
    collector.on('collect', async (buttonInteraction) => {
        if (buttonInteraction.customId === 'backward') {
            const page = content.pages[index - 1];
            if (!page) return;

            --index;
            await interaction.editReply({ embeds: [embed.setDescription(page)] });
        } else if (buttonInteraction.customId === 'forward') {
            const page = content.pages[index + 1];
            if (!page) return;

            ++index;
            await interaction.editReply({ embeds: [embed.setDescription(page)] });
        }

        buttonInteraction.update({
            components: [new ActionRowBuilder<ButtonBuilder>({ components: [backwardButton.setDisabled(!content.pages[index - 1]), forwardButton.setDisabled(!content.pages[index + 1])] })],
        });
    });

    collector.on('end', () => {
        // interaction must be less than 15min old
        interaction.editReply({ components: [] }).catch(() => undefined);
    });
}
