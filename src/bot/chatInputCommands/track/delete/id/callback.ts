import { PermissionFlagsBits } from 'discord.js';
import uuid from 'uuid-random';
import type { ChatInputCommandCallback } from '../../../../chatInputCommandHandler.ts';
import { replyError, replySuccess } from '../../../../lib/embeds.ts';
import { Track } from '../../../../lib/punishment/track.ts';
import { hasPermissionForTarget } from '../../../../lib/searchMessage.ts';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.KickMembers,
    callback: async (interaction) => {
        const id = interaction.options.getString('id', true);
        if (!uuid.test(id)) {
            replyError(interaction, 'The specified UUID is invalid.');
            return;
        }

        try {
            const track = await Track.getByUUID(id);
            if (!(await hasPermissionForTarget(interaction, track.userId))) return;

            const logString = await track.delete(interaction.member.id);
            replySuccess(interaction, logString, 'Delete Track');
        } catch (error) {
            replyError(interaction, String(error));
        }
    },
};
