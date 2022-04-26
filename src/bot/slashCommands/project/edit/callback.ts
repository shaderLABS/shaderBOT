import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { settings } from '../../../bot.js';
import { replyError } from '../../../lib/embeds.js';
import { isProjectOwner } from '../../../lib/project.js';
import { ApplicationCommandCallback, GuildCommandInteraction } from '../../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    callback: async (interaction: GuildCommandInteraction) => {
        const { channel, user } = interaction;

        if (!channel.isText()) return replyError(interaction, 'This command is not usable in thread channels.');
        if (!(await isProjectOwner(user.id, channel.id))) return replyError(interaction, 'You do not have permission to run this command.', 'Insufficient Permissions');
        if (channel.parentId && settings.data.archive.categoryIDs.includes(channel.parentId)) return replyError(interaction, 'This project is archived.');

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
            customId: 'editProjectChannel:' + channel.id,
            title: 'Edit Project Channel',
            // @ts-expect-error
            components: [new ActionRowBuilder<TextInputBuilder>({ components: [nameInput] }), new ActionRowBuilder<TextInputBuilder>({ components: [descriptionInput] })],
        });

        interaction.showModal(modal);
    },
};
