import { ActionRowBuilder, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import type { ChatInputCommandCallback } from '../../../chatInputCommandHandler.ts';
import { replyError } from '../../../lib/embeds.ts';
import { Project } from '../../../lib/project.ts';

export const command: ChatInputCommandCallback = {
    callback: async (interaction) => {
        const { channel } = interaction;
        if (channel.type !== ChannelType.GuildText) {
            replyError(interaction, 'This command is only usable in text channels.', 'Invalid Channel');
            return;
        }

        try {
            const project = await Project.getByChannelID(interaction.channelId);
            project.assertOwner(interaction.user.id).assertNotArchived();
        } catch (error) {
            replyError(interaction, String(error));
            return;
        }

        const nameInput = new TextInputBuilder({
            customId: 'nameInput',
            label: 'Channel Name',
            value: channel.name,
            style: TextInputStyle.Short,
            maxLength: 100,
            minLength: 1,
            required: true,
        });

        const descriptionInput = new TextInputBuilder({
            customId: 'descriptionInput',
            label: 'Channel Description',
            value: channel.topic || undefined,
            placeholder: 'No description.',
            style: TextInputStyle.Paragraph,
            maxLength: 1024,
            required: false,
        });

        const modal = new ModalBuilder({
            customId: 'editProjectChannel:' + interaction.channelId,
            title: 'Edit Project Channel',
            components: [new ActionRowBuilder<TextInputBuilder>({ components: [nameInput] }), new ActionRowBuilder<TextInputBuilder>({ components: [descriptionInput] })],
        });

        interaction.showModal(modal);
    },
};
