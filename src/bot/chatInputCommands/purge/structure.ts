import { ApplicationCommandData, ApplicationCommandOptionType, PermissionFlagsBits } from 'discord.js';

export default {
    name: 'purge',
    description: 'Bulk delete messages in the current channel.',
    defaultMemberPermissions: PermissionFlagsBits.ManageMessages,
    options: [
        {
            name: 'amount',
            description: 'The amount of messages you want to delete. Must be between 1 and 100.',
            type: ApplicationCommandOptionType.Integer,
            required: true,
        },
    ],
} satisfies ApplicationCommandData;
