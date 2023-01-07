import { ApplicationCommandData, ApplicationCommandOptionType, ChannelType, PermissionFlagsBits } from 'discord.js';

export default {
    name: 'lock',
    description: 'Manage locks in the specified or current channel.',
    defaultMemberPermissions: PermissionFlagsBits.KickMembers,
    options: [
        {
            name: 'create',
            description: 'Lock the specified or current channel for a specified amount of time.',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'duration',
                    description: 'The duration of the lock.',
                    type: ApplicationCommandOptionType.String,
                    required: true,
                },
                {
                    name: 'channel',
                    description: 'The channel that should be used. Not specifying a value will default to the current channel.',
                    type: ApplicationCommandOptionType.Channel,
                    channelTypes: [ChannelType.GuildText, ChannelType.GuildVoice],
                    required: false,
                },
            ],
        },
        {
            name: 'lift',
            description: 'Lift the lock in the specified or current channel.',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'channel',
                    description: 'The channel that should be used. Not specifying a value will default to the current channel.',
                    type: ApplicationCommandOptionType.Channel,
                    channelTypes: [ChannelType.GuildText, ChannelType.GuildVoice],
                    required: false,
                },
            ],
        },
    ],
} as ApplicationCommandData;
