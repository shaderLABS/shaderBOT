import { ApplicationCommandData, ApplicationCommandOptionType, PermissionFlagsBits } from 'discord.js';

export default {
    name: 'automaticresponse',
    description: 'Manage automatic responses.',
    defaultMemberPermissions: PermissionFlagsBits.ManageGuild,
    options: [
        {
            name: 'create',
            description: 'Create a new automatic response.',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'alias',
                    description: 'The alias of the new automatic response.',
                    type: ApplicationCommandOptionType.String,
                    required: true,
                },
                {
                    name: 'regex',
                    description: 'The regex of the new automatic response.',
                    type: ApplicationCommandOptionType.String,
                    required: true,
                },
            ],
        },
        {
            name: 'delete',
            description: 'Delete an existing automatic response.',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'alias',
                    description: 'The alias of the automatic response you want to delete.',
                    type: ApplicationCommandOptionType.String,
                    required: true,
                },
            ],
        },
        {
            name: 'read',
            description: 'Send the JSON data of a specific or all automatic responses.',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'alias',
                    description: 'The alias of what you want to read. Not specifying an alias will list all automatic responses.',
                    type: ApplicationCommandOptionType.String,
                    required: false,
                },
            ],
        },
        {
            name: 'update',
            description: 'Update an existing automatic response.',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'alias',
                    description: 'The alias of the automatic response you want to edit.',
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
} satisfies ApplicationCommandData;
