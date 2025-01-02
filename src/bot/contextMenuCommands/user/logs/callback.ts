import { PermissionFlagsBits } from 'discord.js';
import { getUserModerationLogPages } from '../../../chatInputCommands/logs/callback.ts';
import type { UserContextMenuCommandCallback } from '../../../contextMenuCommandHandler.ts';
import { replyButtonPages } from '../../../lib/embeds.ts';

export const command: UserContextMenuCommandCallback = {
    commandName: 'Logs',
    requiredPermissions: PermissionFlagsBits.KickMembers,
    callback: async (interaction) => {
        const { targetUser } = interaction;

        const { pages, quickInformation } = await getUserModerationLogPages(targetUser);
        replyButtonPages(interaction, { pages, title: `Moderation Logs - ${targetUser.username}`, fields: quickInformation }, true);
    },
};
