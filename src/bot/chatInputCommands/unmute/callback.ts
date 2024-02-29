import { PermissionFlagsBits } from 'discord.js';
import type { ChatInputCommandCallback } from '../../chatInputCommandHandler.ts';
import { replyError, replySuccess } from '../../lib/embeds.ts';
import { Punishment } from '../../lib/punishment.ts';
import { hasPermissionForTarget } from '../../lib/searchMessage.ts';

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
            if (error) replyError(interaction, String(error));
        }
    },
};
