import { ChannelType, PermissionFlagsBits } from 'discord.js';
import { ChatInputCommandCallback } from '../../../chatInputCommandHandler.js';
import { replyError } from '../../../lib/embeds.js';
import { Project } from '../../../lib/project.js';

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
