import { ApplicationCommandData, ApplicationCommandOptionType } from 'discord.js';

export default {
    name: 'unmute',
    description: 'Unmute a user.',
    options: [
        {
            name: 'user',
            description: 'The user that will be unmuted.',
            type: ApplicationCommandOptionType.User,
            required: true,
        },
    ],
} as ApplicationCommandData;
