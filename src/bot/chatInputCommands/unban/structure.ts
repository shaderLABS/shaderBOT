import { ApplicationCommandData, ApplicationCommandOptionType, PermissionFlagsBits } from 'discord.js';

export default {
    name: 'unban',
    description: 'Unban a user.',
    defaultMemberPermissions: PermissionFlagsBits.BanMembers,
    options: [
        {
            name: 'user',
            description: 'The user that will be unbanned.',
            type: ApplicationCommandOptionType.User,
            required: true,
        },
    ],
} satisfies ApplicationCommandData;
