import { ApplicationCommandData, ApplicationCommandOptionType } from 'discord.js';

export default {
    name: 'sticky',
    description: 'View information about the stickiness of the current or specified thread.',
    options: [
        {
            name: 'thread',
            description: 'The thread that should be used. Not specifying a value will default to the current thread.',
            type: ApplicationCommandOptionType.Channel,
            required: false,
        },
    ],
} as ApplicationCommandData;
