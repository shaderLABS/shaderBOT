import { ApplicationCommandData, ApplicationCommandOptionType, PermissionFlagsBits } from 'discord.js';

export default {
    name: 'stickythread',
    description: 'Manage the stickiness of threads.',
    defaultMemberPermissions: PermissionFlagsBits.KickMembers,
    options: [
        {
            name: 'create',
            description: 'Mark the current or specified thread as sticky.',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'thread',
                    description: 'The thread that should be used. Not specifying a value will default to the current thread.',
                    type: ApplicationCommandOptionType.Channel,
                    required: false,
                },
            ],
        },
        {
            name: 'lift',
            description: 'Mark the current or specified thread as non-sticky.',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'thread',
                    description: 'The thread that should be used. Not specifying a value will default to the current thread.',
                    type: ApplicationCommandOptionType.Channel,
                    required: false,
                },
            ],
        },
    ],
} as ApplicationCommandData;
