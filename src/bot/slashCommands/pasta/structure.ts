import { ApplicationCommandData, ApplicationCommandOptionType } from 'discord.js';

export default {
    name: 'pasta',
    description: 'Send a specific pasta or a list containing all of them.',
    options: [
        {
            name: 'alias',
            description: 'The alias of the pasta you want to send.',
            type: ApplicationCommandOptionType.String,
            required: false,
        },
    ],
} as ApplicationCommandData;
