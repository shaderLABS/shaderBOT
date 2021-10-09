import { GuildCommandInteraction } from '../../events/interactionCreate.js';
import { unban } from '../../lib/banUser.js';
import { replyError, replySuccess } from '../../lib/embeds.js';
import { parseUser } from '../../lib/misc.js';
import { ApplicationCommandCallback } from '../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: ['BAN_MEMBERS'],
    callback: async (interaction: GuildCommandInteraction) => {
        const targetUser = interaction.options.getUser('user', true);

        try {
            await unban(targetUser.id, interaction.user.id);
            replySuccess(interaction, `${parseUser(targetUser)} has been unbanned.`, 'Unban');
        } catch (error) {
            replyError(interaction, error);
        }
    },
};
