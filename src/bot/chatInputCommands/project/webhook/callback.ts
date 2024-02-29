import { EmbedBuilder } from 'discord.js';
import type { ChatInputCommandCallback } from '../../../chatInputCommandHandler.ts';
import { EmbedColor, EmbedIcon, replyError } from '../../../lib/embeds.ts';
import { Project } from '../../../lib/project.ts';

export const command: ChatInputCommandCallback = {
    callback: async (interaction) => {
        try {
            const project = await Project.getByChannelID(interaction.channelId);
            project.assertOwner(interaction.user.id);

            const { secret, endpoint } = await project.generateWebhookSecret(interaction.user.id);

            // don't use helper function, must stay ephemeral.
            interaction.reply({
                embeds: [
                    new EmbedBuilder({
                        fields: [
                            {
                                name: 'Secret Key',
                                value: '`' + secret.toString('hex') + '`',
                            },
                            {
                                name: 'Release Endpoint',
                                value: `\`${endpoint}\`\nAll webhooks sent to this endpoint will trigger a release message. If you're using GitHub, you will likely want to uncheck everything but the release event.\n[More Information](https://github.com/shaderLABS/shaderBOT/wiki/Projects#webhooks)`,
                            },
                        ],
                        footer: { text: 'DO NOT SHARE THE KEY WITH ANYONE! YOU CAN REGENERATE IT AND INVALIDATE THE OLD ONE BY RUNNING THIS COMMAND AGAIN.', iconURL: EmbedIcon.Info },
                        author: {
                            name: 'Project Webhook',
                            iconURL: EmbedIcon.Success,
                        },
                        color: EmbedColor.Green,
                    }),
                ],
                ephemeral: true,
            });
        } catch (error) {
            replyError(interaction, String(error));
        }
    },
};
