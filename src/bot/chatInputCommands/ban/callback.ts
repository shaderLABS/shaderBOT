import { PermissionFlagsBits } from 'discord.js';
import { ChatInputCommandCallback } from '../../chatInputCommandHandler.js';
import { getContextURL } from '../../lib/context.js';
import { replyError, replySuccess } from '../../lib/embeds.js';
import { Punishment } from '../../lib/punishment.js';
import { hasPermissionForTarget } from '../../lib/searchMessage.js';
import { splitString, stringToSeconds } from '../../lib/time.js';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.BanMembers,
    callback: async (interaction) => {
        const targetUser = interaction.options.getUser('user', true);
        const reason = interaction.options.getString('reason', true);
        const durationString = interaction.options.getString('duration', false);
        const deleteMessages = interaction.options.getBoolean('delete_messages', false) || false;

        if (!(await hasPermissionForTarget(interaction, targetUser, 'bannable'))) return;

        const contextURL = await getContextURL(interaction, targetUser.id);
        if (!contextURL) return;

        if (durationString) {
            try {
                var duration = stringToSeconds(splitString(durationString));
            } catch (error) {
                return replyError(interaction, error);
            }

            try {
                const logString = await Punishment.createBan(targetUser, reason, duration, interaction.user.id, contextURL, deleteMessages ? 7 : undefined);
                replySuccess(interaction, logString, 'Temporary Ban');
            } catch (error) {
                replyError(interaction, error);
            }
        } else {
            try {
                const logString = await Punishment.createBan(targetUser, reason, undefined, interaction.user.id, contextURL, deleteMessages ? 7 : undefined);
                replySuccess(interaction, logString, 'Permanent Ban');
            } catch (error) {
                replyError(interaction, error);
            }
        }
    },
};
