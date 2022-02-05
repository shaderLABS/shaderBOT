import { GuildCommandInteraction } from '../../events/interactionCreate.js';
import { replyError, replySuccess } from '../../lib/embeds.js';
import { parseUser, userToMember } from '../../lib/misc.js';
import { unmute } from '../../lib/muteUser.js';
import { ApplicationCommandCallback } from '../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: ['KICK_MEMBERS'],
    callback: async (interaction: GuildCommandInteraction) => {
        const { member, guild } = interaction;

        const targetUser = interaction.options.getUser('user', true);
        const targetMember = await userToMember(guild, targetUser.id);

        if (targetMember && member.roles.highest.comparePositionTo(targetMember.roles.highest) <= 0)
            return replyError(interaction, "You can't unmute a user with a role higher than or equal to yours.", 'Insufficient Permissions');

        try {
            await unmute(targetUser.id, member.id, targetMember);
            replySuccess(interaction, `${parseUser(targetUser)} has been unmuted.`, 'Unmute');
        } catch (error) {
            if (error) replyError(interaction, error);
        }
    },
};
