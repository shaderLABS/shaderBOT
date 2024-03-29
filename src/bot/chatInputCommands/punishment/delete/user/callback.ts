import { PermissionFlagsBits } from 'discord.js';
import { ChatInputCommandCallback } from '../../../../chatInputCommandHandler.js';
import { replyError, replySuccess } from '../../../../lib/embeds.js';
import { LiftedBan } from '../../../../lib/punishment/ban.js';
import { Kick } from '../../../../lib/punishment/kick.js';
import { LiftedMute } from '../../../../lib/punishment/mute.js';
import { hasPermissionForTarget } from '../../../../lib/searchMessage.js';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.BanMembers,
    callback: async (interaction) => {
        const targetUser = interaction.options.getUser('user', true);

        try {
            const punishment = await Promise.any([Kick.getLatestByUserID(targetUser.id), LiftedBan.getLatestByUserID(targetUser.id), LiftedMute.getLatestByUserID(targetUser.id)]).catch(() =>
                Promise.reject('The specified user does not have any kicks, lifted bans or lifted mutes.')
            );

            if (!(await hasPermissionForTarget(interaction, punishment.userID))) return;
            const logString = await punishment.delete(interaction.user.id);

            replySuccess(interaction, logString, 'Delete ' + punishment.TYPE_STRING);
        } catch (error) {
            replyError(interaction, String(error));
        }
    },
};
