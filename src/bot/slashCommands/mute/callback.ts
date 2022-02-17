import { GuildCommandInteraction } from '../../events/interactionCreate.js';
import { replyError, replySuccess } from '../../lib/embeds.js';
import { parseUser, userToMember } from '../../lib/misc.js';
import { mute } from '../../lib/muteUser.js';
import { getContextURL } from '../../lib/searchMessage.js';
import { formatTimeDate, secondsToString, splitString, stringToSeconds } from '../../lib/time.js';
import { ApplicationCommandCallback } from '../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: ['KICK_MEMBERS'],
    callback: async (interaction: GuildCommandInteraction) => {
        const { member, guild } = interaction;

        const reason = interaction.options.getString('reason', true);
        const targetUser = interaction.options.getUser('user', true);
        const targetMember = await userToMember(guild, targetUser.id);

        if (targetMember && member.roles.highest.comparePositionTo(targetMember.roles.highest) <= 0)
            return replyError(interaction, "You can't mute a user with a role higher than or equal to yours.", 'Insufficient Permissions');

        try {
            var time = stringToSeconds(splitString(interaction.options.getString('time', true)));
        } catch (error) {
            return replyError(interaction, error);
        }

        if (isNaN(time)) return replyError(interaction, 'The specified time exceeds the range of UNIX time.');
        if (time < 10) return replyError(interaction, "You can't mute someone for less than 10 seconds.");
        if (time > 2419200) return replyError(interaction, "You can't mute someone for more than 28 days.");

        if (reason.length > 500) return replyError(interaction, 'The reason must not be more than 500 characters long.');

        const contextURL = await getContextURL(interaction, targetUser.id);
        if (!contextURL) return;

        try {
            const { expire, dmed } = await mute(targetUser.id, time, member.id, reason, contextURL, targetMember);
            replySuccess(
                interaction,
                `${parseUser(targetUser)} has been muted for ${secondsToString(time)} (until ${formatTimeDate(expire)}):\n\`${reason}\`${dmed ? '' : '\n\n*The target could not be DMed.*'}`,
                'Mute'
            );
        } catch (error) {
            if (error) replyError(interaction, error);
        }
    },
};
