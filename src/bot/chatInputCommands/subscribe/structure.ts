import { ApplicationCommandData, ApplicationCommandOptionType, ChannelType } from 'discord.js';

export default {
    name: 'subscribe',
    description: 'Subscribe to notifications of a project.',
    options: [
        {
            name: 'project',
            description: 'The channel of the project you want to subscribe to.',
            type: ApplicationCommandOptionType.Channel,
            channelTypes: [ChannelType.GuildText],
            required: false,
        },
    ],
} as ApplicationCommandData;
