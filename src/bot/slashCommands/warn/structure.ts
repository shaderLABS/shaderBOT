import { ApplicationCommandData, ApplicationCommandOptionType, PermissionFlagsBits } from 'discord.js';

export default {
    name: 'warn',
    description: 'Manage the warnings of a user.',
    defaultMemberPermissions: PermissionFlagsBits.KickMembers,
    options: [
        {
            name: 'create',
            description: 'Create a new warning.',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'user',
                    description: 'The user receiving the warning.',
                    type: ApplicationCommandOptionType.User,
                    required: true,
                },
                {
                    name: 'severity',
                    description: 'The severity of the warning.',
                    type: ApplicationCommandOptionType.Integer,
                    required: true,
                    choices: [
                        {
                            name: '0',
                            value: 0,
                        },
                        {
                            name: '1',
                            value: 1,
                        },
                        {
                            name: '2',
                            value: 2,
                        },
                        {
                            name: '3',
                            value: 3,
                        },
                    ],
                },
                {
                    name: 'reason',
                    description: 'The reason of the warning.',
                    type: ApplicationCommandOptionType.String,
                    maxLength: 512,
                    required: true,
                },
                {
                    name: 'context',
                    description: 'The URL of the message that you want to use as context. Defaults to the most recent message.',
                    type: ApplicationCommandOptionType.String,
                    required: false,
                },
            ],
        },
        {
            name: 'delete',
            description: 'Delete an existing warning.',
            type: ApplicationCommandOptionType.SubcommandGroup,
            options: [
                {
                    name: 'user',
                    description: 'Delete the last warning of a user.',
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: 'user',
                            description: 'The user you want to delete the last warning of.',
                            type: ApplicationCommandOptionType.User,
                            required: true,
                        },
                    ],
                },
                {
                    name: 'id',
                    description: 'Delete a warning with the specified UUID.',
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: 'id',
                            description: 'The UUID of the warning.',
                            type: ApplicationCommandOptionType.String,
                            required: true,
                        },
                    ],
                },
            ],
        },
        {
            name: 'read',
            description: 'Read the warning with the specified UUID.',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'id',
                    description: 'The UUID of the warning you want to read.',
                    type: ApplicationCommandOptionType.String,
                    required: true,
                },
            ],
        },
        {
            name: 'trigger',
            description: 'Trigger the automatic punishment system for the specified user.',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'user',
                    description: 'The user you want to trigger the automatic punishment system for.',
                    type: ApplicationCommandOptionType.User,
                    required: true,
                },
            ],
        },
    ],
} as ApplicationCommandData;
