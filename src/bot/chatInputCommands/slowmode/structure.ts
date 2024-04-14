import { ApplicationCommandData, ApplicationCommandOptionType, PermissionFlagsBits } from 'discord.js';
import { ChannelSlowmode } from '../../lib/channelRestriction/slowmode.js';

export default {
    name: 'slowmode',
    description: 'Manage slowmodes in the specified or current channel.',
    defaultMemberPermissions: PermissionFlagsBits.KickMembers,
    options: [
        {
            name: 'create',
            description: 'Slow the specified or current channel down for a specified amount of time.',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'length',
                    description: 'The time after which users can send another message.',
                    type: ApplicationCommandOptionType.String,
                    required: true,
                },
                {
                    name: 'duration',
                    description: 'The duration of the slowdown.',
                    type: ApplicationCommandOptionType.String,
                    required: true,
                },
                {
                    name: 'channel',
                    description: 'The channel that should be used. Not specifying a value will default to the current channel.',
                    type: ApplicationCommandOptionType.Channel,
                    channelTypes: ChannelSlowmode.CHANNEL_TYPES,
                    required: false,
                },
            ],
        },
        {
            name: 'lift',
            description: 'Lift the slowmode in the specified or current channel.',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'channel',
                    description: 'The channel that should be used. Not specifying a value will default to the current channel.',
                    type: ApplicationCommandOptionType.Channel,
                    channelTypes: ChannelSlowmode.CHANNEL_TYPES,
                    required: false,
                },
            ],
        },
    ],
} satisfies ApplicationCommandData;
