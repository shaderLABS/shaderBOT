import { PermissionFlagsBits } from 'discord.js';
import uuid from 'uuid-random';
import { ChatInputCommandCallback } from '../../../../chatInputCommandHandler.js';
import { replyError, replySuccess } from '../../../../lib/embeds.js';
import { LiftedBan } from '../../../../lib/punishment/ban.js';
import { Kick } from '../../../../lib/punishment/kick.js';
import { LiftedMute } from '../../../../lib/punishment/mute.js';
import { hasPermissionForTarget } from '../../../../lib/searchMessage.js';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.BanMembers,
    callback: async (interaction) => {
        const id = interaction.options.getString('id', true);
        if (!uuid.test(id)) {
            replyError(interaction, 'The specified UUID is invalid.');
            return;
        }

        try {
            const punishment = await Promise.any([Kick.getByUUID(id), LiftedBan.getByUUID(id), LiftedMute.getByUUID(id)]).catch(() => Promise.reject('The specified UUID does not exist.'));

            if (!(await hasPermissionForTarget(interaction, punishment.userID))) return;
            const logString = await punishment.delete(interaction.user.id);

            replySuccess(interaction, logString, 'Delete ' + punishment.TYPE_STRING);
        } catch (error) {
            replyError(interaction, String(error));
        }
    },
};
