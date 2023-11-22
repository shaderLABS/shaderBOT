import { ApplicationCommandData, ApplicationCommandOptionType } from 'discord.js';
import { Project } from '../../lib/project.js';

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
