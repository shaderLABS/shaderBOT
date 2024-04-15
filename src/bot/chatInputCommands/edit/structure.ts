import { ApplicationCommandData, ApplicationCommandOptionType, PermissionFlagsBits } from 'discord.js';

export default {
    name: 'edit',
    description: 'Edit a certain aspect of everything related to moderation.',
    defaultMemberPermissions: PermissionFlagsBits.KickMembers,
    options: [
        {
            name: 'user',
            description: 'Edit a certain aspect of the latest entry of the specified user.',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'user',
                    description: 'The user whose latest entry you want to edit.',
                    type: ApplicationCommandOptionType.User,
                    required: true,
                },
                {
                    name: 'aspect',
                    description: 'The aspect that you want to edit.',
                    type: ApplicationCommandOptionType.String,
                    required: true,
                    choices: [
                        {
                            name: 'Ban Duration',
                            value: 'banduration',
                        },
                        {
                            name: 'Ban Reason',
                            value: 'banreason',
                        },
                        {
                            name: 'Track Reason',
                            value: 'trackreason',
                        },
                        {
                            name: 'Kick Reason',
                            value: 'kickreason',
                        },
                        {
                            name: 'Mute Duration',
                            value: 'muteduration',
                        },
                        {
                            name: 'Mute Reason',
                            value: 'mutereason',
                        },
                        {
                            name: 'Note Content',
                            value: 'note',
                        },
                        {
                            name: 'Warning Reason',
                            value: 'warnreason',
                        },
                        {
                            name: 'Warning Severity',
                            value: 'warnseverity',
                        },
                        {
                            name: 'Context',
                            value: 'context',
                        },
                    ],
                },
                {
                    name: 'value',
                    description: 'The new value. Can be a new reason, amount of time, severity or message URL.',
                    type: ApplicationCommandOptionType.String,
                    maxLength: 512,
                    required: true,
                },
            ],
        },
        {
            name: 'id',
            description: 'Edit a certain aspect of the entry with the specified UUID.',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'id',
                    description: 'The UUID of the entry you want to edit.',
                    type: ApplicationCommandOptionType.String,
                    required: true,
                },
                {
                    name: 'aspect',
                    description: 'The aspect that you want to edit.',
                    type: ApplicationCommandOptionType.String,
                    required: true,
                    choices: [
                        {
                            name: 'Ban Duration',
                            value: 'banduration',
                        },
                        {
                            name: 'Ban Reason',
                            value: 'banreason',
                        },
                        {
                            name: 'Track Reason',
                            value: 'trackreason',
                        },
                        {
                            name: 'Kick Reason',
                            value: 'kickreason',
                        },
                        {
                            name: 'Mute Duration',
                            value: 'muteduration',
                        },
                        {
                            name: 'Mute Reason',
                            value: 'mutereason',
                        },
                        {
                            name: 'Note Content',
                            value: 'note',
                        },
                        {
                            name: 'Warning Reason',
                            value: 'warnreason',
                        },
                        {
                            name: 'Warning Severity',
                            value: 'warnseverity',
                        },
                        {
                            name: 'Context',
                            value: 'context',
                        },
                    ],
                },
                {
                    name: 'value',
                    description: 'The new value. Can be a new reason, content, amount of time or severity.',
                    type: ApplicationCommandOptionType.String,
                    maxLength: 512,
                    required: true,
                },
            ],
        },
    ],
} satisfies ApplicationCommandData;
