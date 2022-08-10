import { ApplicationCommandData, ApplicationCommandOptionType } from 'discord.js';

export default {
    name: 'info',
    description: 'Display information about a specified user or yourself.',
    options: [
        {
            name: 'user',
            description: 'The user you want to display information about.',
            type: ApplicationCommandOptionType.User,
            required: false,
        },
    ],
} as ApplicationCommandData;
