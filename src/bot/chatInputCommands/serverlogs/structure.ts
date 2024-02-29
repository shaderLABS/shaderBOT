import { PermissionFlagsBits, type ApplicationCommandData } from 'discord.js';

export default {
    name: 'serverlogs',
    description: 'Send the STDOUT and STDERR logs of the server.',
    defaultMemberPermissions: PermissionFlagsBits.BanMembers,
} satisfies ApplicationCommandData;
