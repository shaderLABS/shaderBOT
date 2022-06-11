import { ApplicationCommandData, ApplicationCommandOptionType } from 'discord.js';

export default {
    name: 'pasta',
    description: 'Send a pasta.',
    options: [
        {
            name: 'alias',
            description: 'The alias of the pasta you want to send. Type to search by alias and content.',
            type: ApplicationCommandOptionType.String,
            required: true,
            autocomplete: true,
        },
    ],
} as ApplicationCommandData;
