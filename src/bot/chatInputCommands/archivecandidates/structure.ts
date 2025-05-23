import { PermissionFlagsBits, type ApplicationCommandData } from 'discord.js';

export default {
    name: 'archivecandidates',
    description: 'List projects that are eligible for archiving.',
    defaultMemberPermissions: PermissionFlagsBits.ManageChannels,
} satisfies ApplicationCommandData;
