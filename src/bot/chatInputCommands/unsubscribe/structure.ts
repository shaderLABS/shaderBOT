import { ApplicationCommandData, ApplicationCommandOptionType, ChannelType } from 'discord.js';

export default {
    name: 'unsubscribe',
    description: 'Unsubscribe from notifications of a project.',
    options: [
        {
            name: 'project',
            description: 'The channel of the project you want to unsubscribe from.',
            type: ApplicationCommandOptionType.Channel,
            channelTypes: [ChannelType.GuildText],
            required: false,
        },
    ],
} as ApplicationCommandData;
