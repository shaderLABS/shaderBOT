import { ApplicationCommandData, ApplicationCommandOptionType, PermissionFlagsBits } from 'discord.js';
import { Backup } from '../../lib/backup.js';

export default {
    name: 'backup',
    description: 'Manage message backups.',
    defaultMemberPermissions: PermissionFlagsBits.KickMembers,
    options: [
        {
            name: 'create',
            description: 'Create a local and encrypted backup of messages sent in the current or specified channel.',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'channel',
                    description: 'The channel that the messages you want to backup are in.',
                    type: ApplicationCommandOptionType.Channel,
                    channelTypes: Backup.CHANNEL_TYPES,
                    required: false,
                },
                {
                    name: 'limit',
                    description: 'The (maximum) amount of messages you want to backup.',
                    type: ApplicationCommandOptionType.Integer,
                    required: false,
                },
            ],
        },
        {
            name: 'list',
            description: 'Select, decrypt & send a backup.',
            type: ApplicationCommandOptionType.Subcommand,
        },
    ],
} satisfies ApplicationCommandData;
