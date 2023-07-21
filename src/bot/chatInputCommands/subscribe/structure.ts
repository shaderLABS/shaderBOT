import { ApplicationCommandData, ApplicationCommandOptionType } from 'discord.js';
import { Project } from '../../lib/project';

export default {
    name: 'subscribe',
    description: 'Subscribe to notifications of a project.',
    options: [
        {
            name: 'project',
            description: 'The channel of the project you want to subscribe to.',
            type: ApplicationCommandOptionType.Channel,
            channelTypes: Project.CHANNEL_TYPES,
            required: false,
        },
    ],
} satisfies ApplicationCommandData;
