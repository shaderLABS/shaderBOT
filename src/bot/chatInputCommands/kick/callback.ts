import { GuildMember, PermissionFlagsBits } from 'discord.js';
import { ChatInputCommandCallback, GuildCommandInteraction } from '../../chatInputCommandHandler.js';
import { getContextURL } from '../../lib/context.js';
import { replyError, replySuccess } from '../../lib/embeds.js';
import { PastPunishment } from '../../lib/punishment.js';
import { hasPermissionForTarget } from '../../lib/searchMessage.js';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.KickMembers,
    callback: async (interaction: GuildCommandInteraction) => {
        const reason = interaction.options.getString('reason', true);
        const targetMember = interaction.options.getMember('member');

        if (!(targetMember instanceof GuildMember)) return replyError(interaction, 'The specified user is not a member of this guild.');
        if (!(await hasPermissionForTarget(interaction, targetMember, 'kickable'))) return;

        const contextURL = await getContextURL(interaction, targetMember.id);
        if (!contextURL) return;

        try {
            const logString = await PastPunishment.createKick(targetMember, reason, interaction.member.id, contextURL);
            replySuccess(interaction, logString, 'Kick');
        } catch (error) {
            if (error) replyError(interaction, error);
        }
    },
};
