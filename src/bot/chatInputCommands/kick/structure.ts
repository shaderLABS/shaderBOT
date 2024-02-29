import { ApplicationCommandOptionType, PermissionFlagsBits, type ApplicationCommandData } from 'discord.js';

export default {
    name: 'kick',
    description: 'Kick a user.',
    defaultMemberPermissions: PermissionFlagsBits.KickMembers,
    options: [
        {
            name: 'member',
            description: 'The member you want to kick.',
            type: ApplicationCommandOptionType.User,
            required: true,
        },
        {
            name: 'reason',
            description: 'The reason for the kick.',
            type: ApplicationCommandOptionType.String,
            maxLength: 512,
            required: true,
        },
        {
            name: 'context',
            description: 'The URL of the message that you want to use as context. Defaults to the most recent message.',
            type: ApplicationCommandOptionType.String,
            required: false,
        },
    ],
} satisfies ApplicationCommandData;
