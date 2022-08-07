import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { BanAppeal } from '../../../lib/banAppeal.js';
import { replyError } from '../../../lib/embeds.js';
import { ApplicationCommandCallback, GuildCommandInteraction } from '../../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: ['BanMembers'],
    callback: async (interaction: GuildCommandInteraction) => {
        const targetUser = interaction.options.getUser('user', true);

        if (!(await BanAppeal.hasPending(targetUser.id))) return replyError(interaction, 'The specified user does not have any pending ban appeals.');

        const reasonInput = new TextInputBuilder({
            customId: 'reasonInput',
            label: 'Reason',
            style: TextInputStyle.Paragraph,
            required: true,
        });

        const modal = new ModalBuilder({
            customId: 'acceptBanAppeal:' + targetUser.id,
            title: 'Accept Ban Appeal',
            components: [new ActionRowBuilder<TextInputBuilder>({ components: [reasonInput] })],
        });

        interaction.showModal(modal);
    },
};
