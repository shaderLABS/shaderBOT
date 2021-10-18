import { GuildMember } from 'discord.js';
import { GuildCommandInteraction } from '../../events/interactionCreate.js';
import { replyError, replySuccess } from '../../lib/embeds.js';
import { kick } from '../../lib/kickUser.js';
import { parseUser } from '../../lib/misc.js';
import { getContextURL } from '../../lib/searchMessage.js';
import { ApplicationCommandCallback } from '../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: ['KICK_MEMBERS'],
    callback: async (interaction: GuildCommandInteraction) => {
        const targetMember = interaction.options.getMember('member', false);
        if (!(targetMember instanceof GuildMember)) return replyError(interaction, 'The specified user is not a member of this guild.');

        const reason = interaction.options.getString('reason', false);

        if (interaction.member.roles.highest.comparePositionTo(targetMember.roles.highest) <= 0)
            return replyError(interaction, "You can't kick a member with a role higher than or equal to yours.", 'Insufficient Permissions');
        if (!targetMember.kickable) return replyError(interaction, 'This member is not kickable.');

        const contextURL = await getContextURL(interaction);
        if (!contextURL) return;

        try {
            const { dmed } = await kick(targetMember, interaction.member.id, reason, contextURL);
            replySuccess(interaction, `${parseUser(targetMember.user)} has been kicked:\n\`${reason || 'No reason provided.'}\`${dmed ? '' : '\n\n*The target could not be DMed.*'}`, 'Kick');
        } catch (error) {
            if (error) replyError(interaction, error);
        }
    },
};
