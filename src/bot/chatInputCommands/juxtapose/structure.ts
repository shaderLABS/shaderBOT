import { ApplicationCommandData, ApplicationCommandOptionType } from 'discord.js';

export default {
    name: 'juxtapose',
    description: 'Create a juxtapose of two images.',
    options: [
        {
            name: 'upload',
            description: 'Create a juxtapose by uploading two images.',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'left_image',
                    description: 'The image on the left side (or top).',
                    type: ApplicationCommandOptionType.Attachment,
                    required: true,
                },
                {
                    name: 'right_image',
                    description: 'The image on the right side (or bottom).',
                    type: ApplicationCommandOptionType.Attachment,
                    required: true,
                },
                {
                    name: 'left_label',
                    description: 'The label on the left side (or top).',
                    type: ApplicationCommandOptionType.String,
                    required: false,
                },
                {
                    name: 'right_label',
                    description: 'The label on the right side (or bottom).',
                    type: ApplicationCommandOptionType.String,
                    required: false,
                },
                {
                    name: 'vertical',
                    description: 'Whether or not the juxtapose should be vertical instead of horizontal. Defaults to false.',
                    type: ApplicationCommandOptionType.Boolean,
                    required: false,
                },
            ],
        },
        {
            name: 'link',
            description: 'Create a juxtapose by linking to two images.',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'left_image',
                    description: 'The image on the left side (or top).',
                    type: ApplicationCommandOptionType.String,
                    required: true,
                },
                {
                    name: 'right_image',
                    description: 'The image on the right side (or bottom).',
                    type: ApplicationCommandOptionType.String,
                    required: true,
                },
                {
                    name: 'left_label',
                    description: 'The label on the left side (or top).',
                    type: ApplicationCommandOptionType.String,
                    required: false,
                },
                {
                    name: 'right_label',
                    description: 'The label on the right side (or bottom).',
                    type: ApplicationCommandOptionType.String,
                    required: false,
                },
                {
                    name: 'vertical',
                    description: 'Whether or not the juxtapose should be vertical instead of horizontal. Defaults to false.',
                    type: ApplicationCommandOptionType.Boolean,
                    required: false,
                },
            ],
        },
    ],
} satisfies ApplicationCommandData;
