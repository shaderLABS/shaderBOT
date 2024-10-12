import { PermissionFlagsBits } from 'discord.js';
import type { ChatInputCommandCallback } from '../../../../chatInputCommandHandler.ts';
import { replyError, replySuccess } from '../../../../lib/embeds.ts';
import { Track } from '../../../../lib/punishment/track.ts';
import { hasPermissionForTarget } from '../../../../lib/searchMessage.ts';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.KickMembers,
    callback: async (interaction) => {
        const targetUser = interaction.options.getUser('user', true);

        try {
            const track = await Track.getByUserID(targetUser.id);
            if (!(await hasPermissionForTarget(interaction, track.userId))) return;

            const logString = await track.delete(interaction.member.id);
            replySuccess(interaction, logString, 'Delete Track');
        } catch (error) {
            replyError(interaction, String(error));
        }
    },
};
