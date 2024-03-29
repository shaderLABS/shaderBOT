import { PermissionFlagsBits } from 'discord.js';
import { ChatInputCommandCallback } from '../../chatInputCommandHandler.js';
import { replyError, replySuccess } from '../../lib/embeds.js';
import { Mute } from '../../lib/punishment/mute.js';
import { hasPermissionForTarget } from '../../lib/searchMessage.js';

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
