import uuid from 'uuid-random';
import { client } from '../../../bot.js';
import { BanAppeal } from '../../../lib/banAppeal.js';
import { replyError } from '../../../lib/embeds.js';
import { ApplicationCommandCallback, GuildCommandInteraction } from '../../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: ['BanMembers'],
    callback: async (interaction: GuildCommandInteraction) => {
        const id = interaction.options.getString('id', true);
        if (!uuid.test(id)) return replyError(interaction, 'The specified UUID is invalid.');

        try {
            const appeal = await BanAppeal.getByUUID(id);

            const targetUser = await client.users.fetch(appeal.userID).catch(() => undefined);
            if (!targetUser) return replyError(interaction, 'The user who sent the ban appeal could not be resolved.');

            interaction.reply({ embeds: [appeal.toAppealEmbed(targetUser), appeal.toResultEmbed()] });
        } catch (error) {
            replyError(interaction, error);
        }
    },
};
