import { ApplicationCommandData, ApplicationCommandOptionType } from 'discord.js';

export default {
    name: 'unban',
    description: 'Unban a user.',
    options: [
        {
            name: 'user',
            description: 'The user that will be unbanned.',
            type: ApplicationCommandOptionType.User,
            required: true,
        },
    ],
} as ApplicationCommandData;
