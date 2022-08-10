import { ApplicationCommandData, ApplicationCommandOptionType } from 'discord.js';

export default {
    name: 'unsubscribe',
    description: 'Unsubscribe from notifications of a project.',
    options: [
        {
            name: 'project',
            description: 'The channel of the project you want to unsubscribe from.',
            type: ApplicationCommandOptionType.Channel,
            required: false,
        },
    ],
} as ApplicationCommandData;
