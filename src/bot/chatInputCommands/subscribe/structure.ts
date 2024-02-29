import { ApplicationCommandOptionType, type ApplicationCommandData } from 'discord.js';
import { Project } from '../../lib/project.ts';

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
