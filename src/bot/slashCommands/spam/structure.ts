import { ApplicationCommandData, ApplicationCommandOptionType } from 'discord.js';

export default {
    name: 'spam',
    description: 'Kick an account used for spam and delete its recent messages.',
    options: [
        {
            name: 'user',
            description: 'The user whose account is used for spam.',
            type: ApplicationCommandOptionType.User,
            required: true,
        },
        {
            name: 'context',
            description: 'The URL of the message that you want to use as context. Defaults to the most recent message.',
            type: ApplicationCommandOptionType.String,
            required: false,
        },
    ],
} as ApplicationCommandData;
