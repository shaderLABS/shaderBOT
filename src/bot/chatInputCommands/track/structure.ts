import { ApplicationCommandData, ApplicationCommandOptionType, PermissionFlagsBits } from 'discord.js';

export default {
    name: 'track',
    description: 'Manage the track entry of a user.',
    defaultMemberPermissions: PermissionFlagsBits.KickMembers,
    options: [
        {
            name: 'create',
            description: 'Create a new track entry.',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'user',
                    description: 'The user that will be tracked.',
                    type: ApplicationCommandOptionType.User,
                    required: true,
                },
                {
                    name: 'reason',
                    description: 'The reason of the track entry.',
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
            description: 'Delete an existing track entry.',
            type: ApplicationCommandOptionType.SubcommandGroup,
            options: [
                {
                    name: 'user',
                    description: 'Delete the track entry of a user.',
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: 'user',
                            description: 'The user you want to delete the track entry of.',
                            type: ApplicationCommandOptionType.User,
                            required: true,
                        },
                    ],
                },
                {
                    name: 'id',
                    description: 'Delete the track entry with the specified UUID.',
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: 'id',
                            description: 'The UUID of the track entry.',
                            type: ApplicationCommandOptionType.String,
                            required: true,
                        },
                    ],
                },
            ],
        },
    ],
} satisfies ApplicationCommandData;
