import { GuildCommandInteraction } from '../../events/interactionCreate.js';
import { ban, tempban } from '../../lib/banUser.js';
import { replyError, replySuccess } from '../../lib/embeds.js';
import { parseUser, userToMember } from '../../lib/misc.js';
import { getContextURL } from '../../lib/searchMessage.js';
import { splitString, stringToSeconds } from '../../lib/time.js';
import { ApplicationCommandCallback } from '../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: ['BAN_MEMBERS'],
    callback: async (interaction: GuildCommandInteraction) => {
        const targetUser = interaction.options.getUser('user', true);
        const targetMember = await userToMember(interaction.guild, targetUser.id);

        const reason = interaction.options.getString('reason', true);
        const timeString = interaction.options.getString('time', false);
        const deleteMessages = interaction.options.getBoolean('delete_messages', false) || false;

        if (targetMember) {
            if (interaction.member.roles.highest.comparePositionTo(targetMember.roles.highest) <= 0)
                return replyError(interaction, "You can't ban a user with a role higher than or equal to yours.", 'Insufficient Permissions');

            if (!targetMember.bannable) return replyError(interaction, 'This user is not bannable.');
        }

        if (reason.length > 500) return replyError(interaction, 'The reason must not be more than 500 characters long.');

        const contextURL = await getContextURL(interaction);
        if (!contextURL) return;

        if (timeString) {
            const time = stringToSeconds(splitString(timeString));

            if (isNaN(time)) return replyError(interaction, 'The specified time exceeds the range of UNIX time.');
            if (time < 10) return replyError(interaction, "You can't temporarily ban someone for less than 10 seconds.");

            try {
                const { dmed } = await tempban(targetUser, time, interaction.user.id, reason, contextURL, deleteMessages);
                replySuccess(interaction, `${parseUser(targetUser)} has been temporarily banned:\n\`${reason}\`${dmed ? '' : '\n\n*The target could not be DMed.*'}`, 'Temporary Ban');
            } catch (error) {
                replyError(interaction, error);
            }
        } else {
            try {
                const { dmed } = await ban(targetUser, interaction.user.id, reason, contextURL, deleteMessages);
                replySuccess(interaction, `${parseUser(targetUser)} has been banned:\n\`${reason}\`${dmed ? '' : '\n\n*The target could not be DMed.*'}`, 'Ban');
            } catch (error) {
                replyError(interaction, error);
            }
        }
    },
};
