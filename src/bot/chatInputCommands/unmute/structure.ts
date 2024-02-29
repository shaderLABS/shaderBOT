import { ApplicationCommandOptionType, PermissionFlagsBits, type ApplicationCommandData } from 'discord.js';

export default {
    name: 'unmute',
    description: 'Unmute a user.',
    defaultMemberPermissions: PermissionFlagsBits.KickMembers,
    options: [
        {
            name: 'user',
            description: 'The user that will be unmuted.',
            type: ApplicationCommandOptionType.User,
            required: true,
        },
    ],
} satisfies ApplicationCommandData;
