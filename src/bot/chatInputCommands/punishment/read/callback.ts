import { PermissionFlagsBits } from 'discord.js';
import uuid from 'uuid-random';
import type { ChatInputCommandCallback } from '../../../chatInputCommandHandler.ts';
import { replyError, replyInfo } from '../../../lib/embeds.ts';
import { Ban, LiftedBan } from '../../../lib/punishment/ban.ts';
import { Kick } from '../../../lib/punishment/kick.ts';
import { LiftedMute, Mute } from '../../../lib/punishment/mute.ts';
import { Track } from '../../../lib/punishment/track.ts';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.BanMembers,
    callback: async (interaction) => {
        const id = interaction.options.getString('id', true);
        if (!uuid.test(id)) {
            replyError(interaction, 'The specified UUID is invalid.');
            return;
        }

        try {
            const punishment = await Promise.any([Ban.getByUUID(id), Mute.getByUUID(id), Track.getByUUID(id), Kick.getByUUID(id), LiftedBan.getByUUID(id), LiftedMute.getByUUID(id)]).catch(() =>
                Promise.reject('The specified UUID does not exist.')
            );

            replyInfo(interaction, punishment.toString(true), punishment.TYPE_STRING);
        } catch (error) {
            replyError(interaction, String(error));
        }
    },
};
