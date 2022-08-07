import { ApplicationCommandData, ApplicationCommandOptionType, PermissionFlagsBits } from 'discord.js';

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
                    description: 'The user with a pending ban appeal.',
                    type: ApplicationCommandOptionType.User,
                    required: true,
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
                    description: 'The user with a pending ban appeal.',
                    type: ApplicationCommandOptionType.User,
                    required: true,
                },
            ],
        },
        {
            name: 'read',
            description: 'Read a ban appeal with the specified UUID and its current status.',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'id',
                    description: 'The UUID of the ban appeal you want to read.',
                    type: ApplicationCommandOptionType.String,
                    required: true,
                },
            ],
        },
    ],
} as ApplicationCommandData;
