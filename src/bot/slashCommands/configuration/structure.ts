import { ApplicationCommandData, ApplicationCommandOptionType } from 'discord.js';

export default {
    name: 'configuration',
    description: "Manage the bot's configuration.",
    options: [
        {
            name: 'list',
            description: "Print the bot's current configuration.",
            type: ApplicationCommandOptionType.Subcommand,
        },
        {
            name: 'set',
            description: "Edit the bot's current configuration.",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'path',
                    description: 'The path of the value you want to edit, separated with dots.',
                    type: ApplicationCommandOptionType.String,
                    required: true,
                },
                {
                    name: 'value',
                    description: 'The value that you want to insert into the path. Must be valid JSON.',
                    type: ApplicationCommandOptionType.String,
                    required: true,
                },
            ],
        },
    ],
} as ApplicationCommandData;
