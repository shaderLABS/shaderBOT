import { ApplicationCommandData, ApplicationCommandType, PermissionFlagsBits } from 'discord.js';

export default {
    name: 'Logs',
    type: ApplicationCommandType.User,
    defaultMemberPermissions: PermissionFlagsBits.KickMembers,
} satisfies ApplicationCommandData;
