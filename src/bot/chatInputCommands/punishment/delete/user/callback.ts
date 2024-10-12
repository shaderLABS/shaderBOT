import { PermissionFlagsBits } from 'discord.js';
import type { ChatInputCommandCallback } from '../../../../chatInputCommandHandler.ts';
import { replyError, replySuccess } from '../../../../lib/embeds.ts';
import { LiftedBan } from '../../../../lib/punishment/ban.ts';
import { Kick } from '../../../../lib/punishment/kick.ts';
import { LiftedMute } from '../../../../lib/punishment/mute.ts';
import { hasPermissionForTarget } from '../../../../lib/searchMessage.ts';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.BanMembers,
    callback: async (interaction) => {
        const targetUser = interaction.options.getUser('user', true);

        try {
            const punishment = await Promise.any([Kick.getLatestByUserID(targetUser.id), LiftedBan.getLatestByUserID(targetUser.id), LiftedMute.getLatestByUserID(targetUser.id)]).catch(() =>
                Promise.reject('The specified user does not have any kicks, lifted bans or lifted mutes.'),
            );

            if (!(await hasPermissionForTarget(interaction, punishment.userId))) return;
            const logString = await punishment.delete(interaction.user.id);

            replySuccess(interaction, logString, 'Delete ' + punishment.TYPE_STRING);
        } catch (error) {
            replyError(interaction, String(error));
        }
    },
};
