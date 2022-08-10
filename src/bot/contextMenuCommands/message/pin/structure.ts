import { ApplicationCommandData, ApplicationCommandType, PermissionFlagsBits } from 'discord.js';

export default {
    name: 'Pin/Unpin',
    type: ApplicationCommandType.Message,
    defaultMemberPermissions: PermissionFlagsBits.ManageWebhooks,
} as ApplicationCommandData;
