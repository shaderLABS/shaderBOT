import { ApplicationCommandData, ApplicationCommandOptionType, PermissionFlagsBits } from 'discord.js';

export default {
    name: 'punishment',
    description: 'Manage entries of (past) punishments.',
    defaultMemberPermissions: PermissionFlagsBits.BanMembers,
    options: [
        {
            name: 'delete',
            description: 'Delete a past punishment entry.',
            type: ApplicationCommandOptionType.SubcommandGroup,
            options: [
                {
                    name: 'user',
                    description: 'Delete the latest past punishment entry of the specified user.',
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: 'user',
                            description: 'The user whose latest entry you want to delete.',
                            type: ApplicationCommandOptionType.User,
                            required: true,
                        },
                    ],
                },
                {
                    name: 'id',
                    description: 'Delete a past punishment entry with the specified UUID.',
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: 'id',
                            description: 'The UUID of the entry you want to delete.',
                            type: ApplicationCommandOptionType.String,
                            required: true,
                        },
                    ],
                },
            ],
        },
        {
            name: 'read',
            description: 'Read a (past) punishment entry with the specified UUID.',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'id',
                    description: 'The UUID of the entry you want to read.',
                    type: ApplicationCommandOptionType.String,
                    required: true,
                },
            ],
        },
    ],
} satisfies ApplicationCommandData;
