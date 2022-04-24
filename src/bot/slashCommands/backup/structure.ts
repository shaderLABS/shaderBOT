import { ApplicationCommandData, ApplicationCommandOptionType } from 'discord.js';

export default {
    name: 'backup',
    description: 'Manage message backups.',
    options: [
        {
            name: 'create',
            description: 'Create a local and encrypted backup of messages sent in the current or specified channel.',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'channel',
                    description: 'The channel that the messages you want to backup are in.',
                    type: ApplicationCommandOptionType.Channel,
                    required: false,
                },
                {
                    name: 'limit',
                    description: 'The (maximum) amount of messages you want to backup.',
                    type: ApplicationCommandOptionType.Integer,
                    required: false,
                },
            ],
        },
        {
            name: 'list',
            description: 'Select, decrypt & send a backup.',
            type: ApplicationCommandOptionType.Subcommand,
        },
    ],
} as ApplicationCommandData;
