import { PermissionFlagsBits } from 'discord.js';
import type { ChatInputCommandCallback } from '../../chatInputCommandHandler.ts';
import { getContextURL } from '../../lib/context.ts';
import { replySuccess } from '../../lib/embeds.ts';
import log from '../../lib/log.ts';
import { Mute } from '../../lib/punishment/mute.ts';
import { hasPermissionForTarget } from '../../lib/searchMessage.ts';
import { kickSpammer } from '../../lib/spamProtection.ts';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.KickMembers,
    callback: async (interaction) => {
        const targetUser = interaction.options.getUser('user', true);

        if (!(await hasPermissionForTarget(interaction, targetUser, 'bannable'))) return;

        const contextURL = await getContextURL(interaction, targetUser.id);
        if (!contextURL) return;

        const logString = await kickSpammer(targetUser, interaction.user.id, contextURL);
        const mute = await Mute.getByUserID(targetUser.id).catch(() => undefined);
        mute?.lift(interaction.user.id).catch(() => undefined);

        replySuccess(interaction, { description: logString, title: 'Kick Spammer' });
        log(logString, 'Kick Spammer');
    },
};
