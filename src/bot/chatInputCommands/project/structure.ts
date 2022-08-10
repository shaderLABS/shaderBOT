import { ApplicationCommandData, ApplicationCommandOptionType, PermissionFlagsBits } from 'discord.js';

export default {
    name: 'project',
    description: 'Manage and configure a project. This command only works in your project channel(s).',
    defaultMemberPermissions: PermissionFlagsBits.ManageWebhooks,
    options: [
        {
            name: 'edit',
            description: 'Edit the name and description of your project channel.',
            type: ApplicationCommandOptionType.Subcommand,
        },
        {
            name: 'banner',
            description: 'Set or remove the image that can be used as the server banner.',
            type: ApplicationCommandOptionType.SubcommandGroup,
            options: [
                {
                    name: 'set',
                    description: 'Set the image that can be used as the server banner.',
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: 'image',
                            description: 'The image that will be used.',
                            type: ApplicationCommandOptionType.Attachment,
                            required: true,
                        },
                        {
                            name: 'label',
                            description: 'Add a label to the image.',
                            type: ApplicationCommandOptionType.Boolean,
                            required: true,
                        },
                        {
                            name: 'label_text',
                            description: 'The text of the added label, if enabled. Defaults to the channel name.',
                            type: ApplicationCommandOptionType.String,
                            required: false,
                        },
                    ],
                },
                {
                    name: 'remove',
                    description: 'Remove the image that can be used as the server banner.',
                    type: ApplicationCommandOptionType.Subcommand,
                },
            ],
        },
        {
            name: 'mute',
            description: 'Mute a user in your project channel.',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'user',
                    description: 'The user you want to mute.',
                    type: ApplicationCommandOptionType.User,
                    required: true,
                },
            ],
        },
        {
            name: 'unmute',
            description: 'Unmute a user in your project channel.',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'user',
                    description: 'The user you want to unmute.',
                    type: ApplicationCommandOptionType.User,
                    required: true,
                },
            ],
        },
        {
            name: 'ping',
            description: 'Ping all users that are subscribed to this project.',
            type: ApplicationCommandOptionType.Subcommand,
        },
        {
            name: 'webhook',
            description: 'Set up webhooks for your project and (re)generate a secret key for signing them.',
            type: ApplicationCommandOptionType.Subcommand,
        },
    ],
} as ApplicationCommandData;
