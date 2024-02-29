import { ApplicationCommandOptionType, type ApplicationCommandData } from 'discord.js';
import { StickyThread } from '../../lib/stickyThread.ts';

export default {
    name: 'sticky',
    description: 'View information about the stickiness of the current or specified thread.',
    options: [
        {
            name: 'thread',
            description: 'The thread that should be used. Not specifying a value will default to the current thread.',
            type: ApplicationCommandOptionType.Channel,
            channelTypes: StickyThread.CHANNEL_TYPES,
            required: false,
        },
    ],
} satisfies ApplicationCommandData;
