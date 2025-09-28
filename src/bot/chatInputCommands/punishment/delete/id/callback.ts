import { PermissionFlagsBits } from 'discord.js';
import type { ChatInputCommandCallback } from '../../../../chatInputCommandHandler.ts';
import { replyError, replySuccess } from '../../../../lib/embeds.ts';
import { isValidUuid } from '../../../../lib/misc.ts';
import { LiftedBan } from '../../../../lib/punishment/ban.ts';
import { Kick } from '../../../../lib/punishment/kick.ts';
import { LiftedMute } from '../../../../lib/punishment/mute.ts';
import { hasPermissionForTarget } from '../../../../lib/searchMessage.ts';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.BanMembers,
    callback: async (interaction) => {
        const id = interaction.options.getString('id', true);
        if (!isValidUuid(id)) {
            replyError(interaction, { description: 'The specified UUID is invalid.' });
            return;
        }

        try {
            const punishment = await Promise.any([Kick.getByUUID(id), LiftedBan.getByUUID(id), LiftedMute.getByUUID(id)]).catch(() => Promise.reject('The specified UUID does not exist.'));

            if (!(await hasPermissionForTarget(interaction, punishment.userId))) return;
            const logString = await punishment.delete(interaction.user.id);

            replySuccess(interaction, { description: logString, title: 'Delete ' + punishment.TYPE_STRING });
        } catch (error) {
            replyError(interaction, { description: String(error) });
        }
    },
};
