import { replyError, replySuccess } from '../../lib/embeds.js';
import { Punishment } from '../../lib/punishment.js';
import { ApplicationCommandCallback, GuildCommandInteraction } from '../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: ['BanMembers'],
    callback: async (interaction: GuildCommandInteraction) => {
        const targetUser = interaction.options.getUser('user', true);

        try {
            const ban = await Punishment.getByUserID(targetUser.id, 'ban');
            const logString = await ban.move(interaction.user.id);
            replySuccess(interaction, logString, 'Unban');
        } catch (error) {
            replyError(interaction, error);
        }
    },
};
