import { ApplicationCommandOptionType, PermissionFlagsBits, type ApplicationCommandData } from 'discord.js';

export default {
    name: 'note',
    description: 'Manage the notes of a user.',
    defaultMemberPermissions: PermissionFlagsBits.KickMembers,
    options: [
        {
            name: 'create',
            description: 'Create a new note.',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'user',
                    description: 'The user you want to add the note to.',
                    type: ApplicationCommandOptionType.User,
                    required: true,
                },
                {
                    name: 'content',
                    description: 'The content of the note.',
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
            description: 'Delete an existing note.',
            type: ApplicationCommandOptionType.SubcommandGroup,
            options: [
                {
                    name: 'user',
                    description: 'Delete the last note of a user.',
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: 'user',
                            description: 'The user you want to delete the last note of.',
                            type: ApplicationCommandOptionType.User,
                            required: true,
                        },
                    ],
                },
                {
                    name: 'id',
                    description: 'Delete a note with the specified UUID.',
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: 'id',
                            description: 'The UUID of the note.',
                            type: ApplicationCommandOptionType.String,
                            required: true,
                        },
                    ],
                },
            ],
        },
        {
            name: 'read',
            description: 'Read the note with the specified UUID.',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'id',
                    description: 'The UUID of the note you want to read.',
                    type: ApplicationCommandOptionType.String,
                    required: true,
                },
            ],
        },
    ],
} satisfies ApplicationCommandData;
