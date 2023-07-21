import { ApplicationCommandData, PermissionFlagsBits } from 'discord.js';

export default {
    name: 'restart',
    description: 'Restart the bot.',
    defaultMemberPermissions: PermissionFlagsBits.BanMembers,
} satisfies ApplicationCommandData;
