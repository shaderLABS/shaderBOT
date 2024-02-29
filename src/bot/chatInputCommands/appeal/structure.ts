import { ApplicationCommandOptionType, PermissionFlagsBits, type ApplicationCommandData } from 'discord.js';

export default {
    name: 'appeal',
    description: 'Accept or decline ban appeals.',
    defaultMemberPermissions: PermissionFlagsBits.BanMembers,
    options: [
        {
            name: 'accept',
            description: 'Accept a ban appeal.',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'user',
                    description: 'The user with a pending ban appeal. Not specifying a value will default to the current thread.',
                    type: ApplicationCommandOptionType.User,
                    required: false,
                },
            ],
        },

        {
            name: 'decline',
            description: 'Decline a ban appeal.',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'user',
                    description: 'The user with a pending ban appeal. Not specifying a value will default to the current thread.',
                    type: ApplicationCommandOptionType.User,
                    required: false,
                },
            ],
        },
        {
            name: 'read',
            description: 'Read a ban appeal and its current status.',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'id',
                    description: 'The UUID of the ban appeal. Not specifying a value will default to the current thread.',
                    type: ApplicationCommandOptionType.String,
                    required: false,
                },
            ],
        },
        {
            name: 'edit',
            description: 'Edit the result reason of a ban appeal.',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'id',
                    description: 'The UUID of the ban appeal. Not specifying a value will default to the current thread.',
                    type: ApplicationCommandOptionType.String,
                    required: false,
                },
            ],
        },
    ],
} satisfies ApplicationCommandData;
