import { ChannelType, PermissionFlagsBits } from 'discord.js';
import type { ChatInputCommandCallback } from '../../../chatInputCommandHandler.ts';
import { replyError } from '../../../lib/embeds.ts';
import { Project } from '../../../lib/project.ts';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.ManageChannels,
    callback: async (interaction) => {
        if (interaction.channel.type !== ChannelType.GuildText) {
            replyError(interaction, 'This command is only usable in text channels.', 'Invalid Channel');
            return;
        }

        try {
            const initializationEmbed = await Project.create(interaction.channel, interaction.user.id);
            interaction.reply({ embeds: [initializationEmbed] });
        } catch (error) {
            replyError(interaction, String(error));
        }
    },
};
