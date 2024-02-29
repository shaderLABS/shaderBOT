import { PermissionFlagsBits } from 'discord.js';
import type { ChatInputCommandCallback } from '../../chatInputCommandHandler.ts';
import { replyError, replySuccess } from '../../lib/embeds.ts';
import { Mute } from '../../lib/punishment/mute.ts';
import { hasPermissionForTarget } from '../../lib/searchMessage.ts';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.KickMembers,
    callback: async (interaction) => {
        const { member } = interaction;

        const targetUser = interaction.options.getUser('user', true);
        if (!(await hasPermissionForTarget(interaction, targetUser, 'moderatable'))) return;

        try {
            const mute = await Mute.getByUserID(targetUser.id);
            const logString = await mute.lift(member.id);
            replySuccess(interaction, logString, 'Unmute');
        } catch (error) {
            if (error) replyError(interaction, String(error));
        }
    },
};
