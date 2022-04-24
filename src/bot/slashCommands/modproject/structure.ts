import { ApplicationCommandData, ApplicationCommandOptionType } from 'discord.js';

export default {
    name: 'modproject',
    description: 'Create and manage projects.',
    options: [
        {
            name: 'create',
            description: 'Create a new project linked to the current channel.',
            type: ApplicationCommandOptionType.Subcommand,
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
} as ApplicationCommandData;
