import { ApplicationCommandData, ApplicationCommandOptionType, PermissionFlagsBits } from 'discord.js';
import { Project } from '../../lib/project';

export default {
    name: 'modproject',
    description: 'Create and manage projects.',
    defaultMemberPermissions: PermissionFlagsBits.ManageChannels,
    options: [
        {
            name: 'create',
            description: 'Create a new project linked to the current channel.',
            type: ApplicationCommandOptionType.Subcommand,
        },
        {
            name: 'move',
            description: 'Move the project channel into a different category, updating the archive state if needed.',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'category',
                    description: 'The category to move the project channel into.',
                    type: ApplicationCommandOptionType.Channel,
                    channelTypes: Project.CATEGORY_CHANNEL_TYPES,
                    required: true,
                },
            ],
        },
        {
            name: 'delete',
            description: 'Delete the project linked to the current channel.',
            type: ApplicationCommandOptionType.Subcommand,
        },
        {
            name: 'owner',
            description: 'Manage owners in the project linked to the current channel.',
            type: ApplicationCommandOptionType.SubcommandGroup,
            options: [
                {
                    name: 'add',
                    description: 'Add an owner to the project linked to the current channel.',
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: 'user',
                            description: 'The user you want to add.',
                            type: ApplicationCommandOptionType.User,
                            required: true,
                        },
                    ],
                },
                {
                    name: 'remove',
                    description: 'Remove an owner from the project linked to the current channel.',
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: 'user',
                            description: 'The user you want to remove.',
                            type: ApplicationCommandOptionType.User,
                            required: true,
                        },
                    ],
                },
            ],
        },
    ],
} satisfies ApplicationCommandData;
