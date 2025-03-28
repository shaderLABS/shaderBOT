import { PermissionFlagsBits } from 'discord.js';
import type { ChatInputCommandCallback } from '../../chatInputCommandHandler.ts';
import { getContextURL } from '../../lib/context.ts';
import { replyError, replySuccess } from '../../lib/embeds.ts';
import { Ban } from '../../lib/punishment/ban.ts';
import { hasPermissionForTarget } from '../../lib/searchMessage.ts';
import { splitString, stringToSeconds } from '../../lib/time.ts';

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
                replyError(interaction, { description: String(error) });
                return;
            }

            try {
                const logString = await Ban.create(targetUser, reason, duration, interaction.user.id, contextURL, deleteMessages ? 604800 : undefined);
                replySuccess(interaction, { description: logString, title: 'Temporary Ban' });
            } catch (error) {
                replyError(interaction, { description: String(error) });
            }
        } else {
            try {
                const logString = await Ban.create(targetUser, reason, undefined, interaction.user.id, contextURL, deleteMessages ? 604800 : undefined);
                replySuccess(interaction, { description: logString, title: 'Permanent Ban' });
            } catch (error) {
                replyError(interaction, { description: String(error) });
            }
        }
    },
};
