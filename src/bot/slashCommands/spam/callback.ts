import { GuildCommandInteraction } from '../../events/interactionCreate.js';
import { replyError, replySuccess } from '../../lib/embeds.js';
import { kickSpammer } from '../../lib/kickUser.js';
import log from '../../lib/log.js';
import { parseUser, userToMember } from '../../lib/misc.js';
import { unmute } from '../../lib/muteUser.js';
import { getContextURL } from '../../lib/searchMessage.js';
import { ApplicationCommandCallback } from '../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: ['KICK_MEMBERS'],
    callback: async (interaction: GuildCommandInteraction) => {
        const targetUser = interaction.options.getUser('user', true);
        const targetMember = await userToMember(interaction.guild, targetUser.id);

        if (targetMember) {
            if (interaction.member.roles.highest.comparePositionTo(targetMember.roles.highest) <= 0)
                return replyError(interaction, "You can't kick a user with a role higher than or equal to yours.", 'Insufficient Permissions');

            if (!targetMember.bannable) return replyError(interaction, 'This user is not bannable.');
        }

        const contextURL = await getContextURL(interaction, targetUser.id);
        if (!contextURL) return;

        const { dmed } = await kickSpammer(targetUser, interaction.user.id, contextURL);
        unmute(targetUser.id, interaction.user.id).catch(() => undefined);

        replySuccess(interaction, `Successfully kicked ${parseUser(targetUser)} for spamming. ${dmed ? '' : '\n\n*The target could not be DMed.*'}`, 'Kick Spammer');
        log(`${parseUser(interaction.user)} kicked ${parseUser(targetUser)} for spamming. ${dmed ? '' : '\n\n*The target could not be DMed.*'}`, 'Kick Spammer');
    },
};
