import { ApplicationCommandOptionType, PermissionFlagsBits, type ApplicationCommandData } from 'discord.js';

export default {
    name: 'ban',
    description: 'Ban a user temporarily or permanently.',
    defaultMemberPermissions: PermissionFlagsBits.BanMembers,
    options: [
        {
            name: 'user',
            description: 'The user that will be banned.',
            type: ApplicationCommandOptionType.User,
            required: true,
        },
        {
            name: 'reason',
            description: 'The reason of the ban.',
            type: ApplicationCommandOptionType.String,
            maxLength: 512,
            required: true,
        },
        {
            name: 'duration',
            description: 'The amount of time that the user will be banned for.',
            type: ApplicationCommandOptionType.String,
            required: false,
        },
        {
            name: 'delete_messages',
            description: 'Whether or not the messages of the banned user should be deleted. Defaults to false.',
            type: ApplicationCommandOptionType.Boolean,
            required: false,
        },
        {
            name: 'context',
            description: 'The URL of the message that you want to use as context. Defaults to the most recent message.',
            type: ApplicationCommandOptionType.String,
            required: false,
        },
    ],
} satisfies ApplicationCommandData;
