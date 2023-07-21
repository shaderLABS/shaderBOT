import { ApplicationCommandData, PermissionFlagsBits } from 'discord.js';

export default {
    name: 'serverinfo',
    description: 'Send memory usage, uptime and other information about the server.',
    defaultMemberPermissions: PermissionFlagsBits.BanMembers,
} satisfies ApplicationCommandData;
