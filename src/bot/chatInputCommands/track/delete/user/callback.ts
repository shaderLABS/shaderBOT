import { PermissionFlagsBits } from 'discord.js';
import { ChatInputCommandCallback } from '../../../../chatInputCommandHandler.js';
import { replyError, replySuccess } from '../../../../lib/embeds.js';
import { Track } from '../../../../lib/punishment/track.js';
import { hasPermissionForTarget } from '../../../../lib/searchMessage.js';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.KickMembers,
    callback: async (interaction) => {
        const targetUser = interaction.options.getUser('user', true);

        try {
            const track = await Track.getByUserID(targetUser.id);
            if (!(await hasPermissionForTarget(interaction, track.userID))) return;

            const logString = await track.delete(interaction.member.id);
            replySuccess(interaction, logString, 'Delete Track');
        } catch (error) {
            replyError(interaction, String(error));
        }
    },
};
