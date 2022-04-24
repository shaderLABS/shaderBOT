import { ApplicationCommandData, ApplicationCommandOptionType } from 'discord.js';

export default {
    name: 'appeal',
    description: 'Accept or decline ban appeals.',
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
                {
                    name: 'reason',
                    description: "The reason of the acceptation, which won't be displayed to the user.",
                    type: ApplicationCommandOptionType.String,
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
                {
                    name: 'reason',
                    description: 'The reason of the declination.',
                    type: ApplicationCommandOptionType.String,
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
