import { ApplicationCommandType, PermissionFlagsBits, type ApplicationCommandData } from 'discord.js';

export default {
    name: 'Pin/Unpin',
    type: ApplicationCommandType.Message,
    defaultMemberPermissions: PermissionFlagsBits.ManageWebhooks,
} satisfies ApplicationCommandData;
