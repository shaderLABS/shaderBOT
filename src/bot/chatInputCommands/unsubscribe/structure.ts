import { ApplicationCommandOptionType, type ApplicationCommandData } from 'discord.js';
import { Project } from '../../lib/project.ts';

export default {
    name: 'unsubscribe',
    description: 'Unsubscribe from notifications of a project.',
    options: [
        {
            name: 'project',
            description: 'The channel of the project you want to unsubscribe from.',
            type: ApplicationCommandOptionType.Channel,
            channelTypes: Project.CHANNEL_TYPES,
            required: false,
        },
    ],
} satisfies ApplicationCommandData;
