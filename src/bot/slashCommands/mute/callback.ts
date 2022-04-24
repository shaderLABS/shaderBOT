import { getContextURL } from '../../lib/context.js';
import { replyError, replySuccess } from '../../lib/embeds.js';
import { Punishment } from '../../lib/punishment.js';
import { hasPermissionForTarget } from '../../lib/searchMessage.js';
import { splitString, stringToSeconds } from '../../lib/time.js';
import { ApplicationCommandCallback, GuildCommandInteraction } from '../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: ['KickMembers'],
    callback: async (interaction: GuildCommandInteraction) => {
        const { member } = interaction;

        const reason = interaction.options.getString('reason', true);
        const targetUser = interaction.options.getUser('user', true);

        if (!(await hasPermissionForTarget(interaction, targetUser, 'moderatable'))) return;

        try {
            var time = stringToSeconds(splitString(interaction.options.getString('time', true)));
        } catch (error) {
            return replyError(interaction, error);
        }

        const contextURL = await getContextURL(interaction, targetUser.id);
        if (!contextURL) return;

        try {
            const logString = await Punishment.createMute(targetUser, reason, time, member.id, contextURL);
            replySuccess(interaction, logString, 'Mute');
        } catch (error) {
            if (error) replyError(interaction, error);
        }
    },
};
