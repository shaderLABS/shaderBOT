import { PermissionFlagsBits } from 'discord.js';
import type { ChatInputCommandCallback } from '../../../chatInputCommandHandler.ts';
import automaticPunishment from '../../../lib/automaticPunishment.ts';
import { replySuccess } from '../../../lib/embeds.ts';
import log from '../../../lib/log.ts';
import { parseUser } from '../../../lib/misc.ts';
import { hasPermissionForTarget } from '../../../lib/searchMessage.ts';

const actionToString = ['They did not get punished.', 'They have been muted.', 'They have been temporarily banned.', 'They have been permanently banned.'];

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.KickMembers,
    callback: async (interaction) => {
        const targetUser = interaction.options.getUser('user', true);
        if (!(await hasPermissionForTarget(interaction, targetUser))) return;

        const action = await automaticPunishment(targetUser);

        const logString = `${parseUser(interaction.user)} triggered the automatic punishment system for ${parseUser(targetUser)}. ${actionToString[action]}`;

        log(logString, 'Trigger Punishment');
        replySuccess(interaction, { description: logString, title: 'Trigger Punishment' });
    },
};
