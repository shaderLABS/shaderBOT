import { ActionRowBuilder, ModalBuilder, PermissionFlagsBits, TextInputBuilder, TextInputStyle } from 'discord.js';
import { BanAppeal } from '../../../lib/banAppeal.js';
import { replyError } from '../../../lib/embeds.js';
import { ApplicationCommandCallback, GuildCommandInteraction } from '../../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: PermissionFlagsBits.BanMembers,
    callback: async (interaction: GuildCommandInteraction) => {
        const targetUser = interaction.options.getUser('user', false);

        try {
            let appeal: BanAppeal;
            if (targetUser) {
                appeal = await BanAppeal.getPendingByUserID(targetUser.id);
            } else {
                if (!interaction.channel.isThread()) throw 'You must either specify a user or use this command in the thread of a ban appeal.';

                appeal = await BanAppeal.getByThreadID(interaction.channel.id);
                if (appeal.result !== 'pending') throw 'The specified ban appeal is already closed.';
            }

            const reasonInput = new TextInputBuilder({
                customId: 'reasonInput',
                label: 'Reason',
                style: TextInputStyle.Paragraph,
                maxLength: 2048,
                required: true,
            });

            const modal = new ModalBuilder({
                customId: 'declineBanAppeal:' + appeal.id,
                title: 'Decline Ban Appeal',
                components: [new ActionRowBuilder<TextInputBuilder>({ components: [reasonInput] })],
            });

            interaction.showModal(modal);
        } catch (error) {
            replyError(interaction, error);
        }
    },
};
