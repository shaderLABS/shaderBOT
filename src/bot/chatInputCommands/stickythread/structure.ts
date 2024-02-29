import { ApplicationCommandOptionType, PermissionFlagsBits, type ApplicationCommandData } from 'discord.js';
import { StickyThread } from '../../lib/stickyThread.ts';

export default {
    name: 'stickythread',
    description: 'Manage the stickiness of threads.',
    defaultMemberPermissions: PermissionFlagsBits.KickMembers,
    options: [
        {
            name: 'create',
            description: 'Mark the current or specified thread as sticky.',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'thread',
                    description: 'The thread that should be used. Not specifying a value will default to the current thread.',
                    type: ApplicationCommandOptionType.Channel,
                    channelTypes: StickyThread.CHANNEL_TYPES,
                    required: false,
                },
            ],
        },
        {
            name: 'lift',
            description: 'Mark the current or specified thread as non-sticky.',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'thread',
                    description: 'The thread that should be used. Not specifying a value will default to the current thread.',
                    type: ApplicationCommandOptionType.Channel,
                    channelTypes: StickyThread.CHANNEL_TYPES,
                    required: false,
                },
            ],
        },
    ],
} satisfies ApplicationCommandData;
