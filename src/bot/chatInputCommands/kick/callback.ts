import { GuildMember, PermissionFlagsBits } from 'discord.js';
import type { ChatInputCommandCallback } from '../../chatInputCommandHandler.ts';
import { getContextURL } from '../../lib/context.ts';
import { replyError, replySuccess } from '../../lib/embeds.ts';
import { Kick } from '../../lib/punishment/kick.ts';
import { hasPermissionForTarget } from '../../lib/searchMessage.ts';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.KickMembers,
    callback: async (interaction) => {
        const reason = interaction.options.getString('reason', true);
        const targetMember = interaction.options.getMember('member');

        if (!(targetMember instanceof GuildMember)) {
            replyError(interaction, 'The specified user is not a member of this guild.');
            return;
        }

        if (!(await hasPermissionForTarget(interaction, targetMember, 'kickable'))) return;

        const contextURL = await getContextURL(interaction, targetMember.id);
        if (!contextURL) return;

        try {
            const logString = await Kick.create(targetMember, reason, interaction.member.id, contextURL);
            replySuccess(interaction, logString, 'Kick');
        } catch (error) {
            if (error) replyError(interaction, String(error));
        }
    },
};
