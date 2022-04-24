import { ApplicationCommandData, ApplicationCommandOptionType } from 'discord.js';

export default {
    name: 'logs',
    description: 'Sends all moderation-related logs of a user.',
    options: [
        {
            name: 'user',
            description: 'The user you want the logs from.',
            type: ApplicationCommandOptionType.User,
            required: true,
        },
    ],
} as ApplicationCommandData;
