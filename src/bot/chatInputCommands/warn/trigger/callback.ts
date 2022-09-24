import { PermissionFlagsBits } from 'discord.js';
import { ChatInputCommandCallback } from '../../../chatInputCommandHandler.js';
import automaticPunishment from '../../../lib/automaticPunishment.js';
import { replySuccess } from '../../../lib/embeds.js';
import log from '../../../lib/log.js';
import { parseUser } from '../../../lib/misc.js';
import { hasPermissionForTarget } from '../../../lib/searchMessage.js';

const actionToString = ['They did not get punished.', 'They have been muted.', 'They have been temporarily banned.', 'They have been permanently banned.'];

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.KickMembers,
    callback: async (interaction) => {
        const targetUser = interaction.options.getUser('user', true);
        if (!(await hasPermissionForTarget(interaction, targetUser))) return;

        const action = await automaticPunishment(targetUser);

        const logString = `${parseUser(interaction.user)} triggered the automatic punishment system for ${parseUser(targetUser)}. ${actionToString[action]}`;

        log(logString, 'Trigger Punishment');
        replySuccess(interaction, logString, 'Trigger Punishment');
    },
};
