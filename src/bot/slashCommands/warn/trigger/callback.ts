import { GuildCommandInteraction } from '../../../events/interactionCreate.js';
import automaticPunishment from '../../../lib/automaticPunishment.js';
import { replyError, replySuccess } from '../../../lib/embeds.js';
import log from '../../../lib/log.js';
import { parseUser, userToMember } from '../../../lib/misc.js';
import { ApplicationCommandCallback } from '../../../slashCommandHandler.js';

const actionToString = ['They did not get punished.', 'They have been muted.', 'They have been temporarily banned.', 'They have been permanently banned.'];

export const command: ApplicationCommandCallback = {
    requiredPermissions: ['KICK_MEMBERS'],
    callback: async (interaction: GuildCommandInteraction) => {
        const targetUser = interaction.options.getUser('user', true);
        const targetMember = await userToMember(interaction.guild, targetUser.id);

        if (targetMember && interaction.member.roles.highest.comparePositionTo(targetMember.roles.highest) <= 0)
            return replyError(interaction, "You can't warn a user with a role higher than or equal to yours.", 'Insufficient Permissions');

        const action = await automaticPunishment(targetUser, targetMember);

        log(`${parseUser(interaction.user)} triggered the automatic punishment system for ${parseUser(targetUser)}. ${actionToString[action]}`, 'Trigger Punishment');
        replySuccess(interaction, `Successfully triggered the automatic punishment system for ${parseUser(targetUser)}. ${actionToString[action]}`, 'Trigger Punishment');
    },
};
