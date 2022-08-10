import { ApplicationCommandData, ApplicationCommandOptionType, PermissionFlagsBits } from 'discord.js';

export default {
    name: 'modpasta',
    description: 'Manage pastas.',
    defaultMemberPermissions: PermissionFlagsBits.ManageGuild,
    options: [
        {
            name: 'create',
            description: 'Create a new pasta.',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'alias',
                    description: 'The alias of the new pasta.',
                    type: ApplicationCommandOptionType.String,
                    required: true,
                },
            ],
        },
        {
            name: 'delete',
            description: 'Delete an existing pasta.',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'alias',
                    description: 'The alias of the pasta you want to delete.',
                    type: ApplicationCommandOptionType.String,
                    required: true,
                },
            ],
        },
        {
            name: 'read',
            description: 'Send the JSON data of a specific pasta.',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'alias',
                    description: 'The alias of the pasta you want to read.',
                    type: ApplicationCommandOptionType.String,
                    required: true,
                },
            ],
        },
        {
            name: 'update',
            description: 'Update an existing pasta.',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'alias',
                    description: 'The alias of the pasta you want to edit.',
                    type: ApplicationCommandOptionType.String,
                    required: true,
                },
                {
                    name: 'path',
                    description: 'The path of the value you want to edit, separated with dots.',
                    type: ApplicationCommandOptionType.String,
                    required: true,
                },
                {
                    name: 'value',
                    description: 'The JSON value that you want to insert into the path. Not specifying a value will delete the key.',
                    type: ApplicationCommandOptionType.String,
                    required: false,
                },
            ],
        },
    ],
} as ApplicationCommandData;
