import { ApplicationCommandData, ApplicationCommandOptionType } from 'discord.js';

export default {
    name: 'kick',
    description: 'Kick a user.',
    options: [
        {
            name: 'member',
            description: 'The member you want to kick.',
            type: ApplicationCommandOptionType.User,
            required: true,
        },
        {
            name: 'reason',
            description: 'The reason for the kick.',
            type: ApplicationCommandOptionType.String,
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
