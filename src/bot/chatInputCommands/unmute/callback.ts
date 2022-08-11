import { PermissionFlagsBits } from 'discord.js';
import { ChatInputCommandCallback } from '../../chatInputCommandHandler.js';
import { replyError, replySuccess } from '../../lib/embeds.js';
import { Punishment } from '../../lib/punishment.js';
import { hasPermissionForTarget } from '../../lib/searchMessage.js';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.KickMembers,
    callback: async (interaction) => {
        const { member } = interaction;

        const targetUser = interaction.options.getUser('user', true);
        if (!(await hasPermissionForTarget(interaction, targetUser, 'moderatable'))) return;

        try {
            const mute = await Punishment.getByUserID(targetUser.id, 'mute');
            const logString = await mute.move(member.id);
            replySuccess(interaction, logString, 'Unmute');
        } catch (error) {
            if (error) replyError(interaction, error);
        }
    },
};
