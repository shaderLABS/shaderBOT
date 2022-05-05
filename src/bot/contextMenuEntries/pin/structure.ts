import { ApplicationCommandData, ApplicationCommandType, PermissionFlagsBits } from 'discord.js';

export default {
    name: 'Pin/Unpin Message',
    type: ApplicationCommandType.Message,
    defaultMemberPermissions: PermissionFlagsBits.ManageWebhooks,
} as ApplicationCommandData;
