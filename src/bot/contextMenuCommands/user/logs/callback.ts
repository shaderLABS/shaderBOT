import { PermissionFlagsBits } from 'discord.js';
import { getUserModerationLogPages } from '../../../chatInputCommands/logs/callback.js';
import { UserContextMenuCommandCallback } from '../../../contextMenuCommandHandler.js';
import { replyButtonPages } from '../../../lib/embeds.js';

export const command: UserContextMenuCommandCallback = {
    commandName: 'Logs',
    requiredPermissions: PermissionFlagsBits.KickMembers,
    callback: async (interaction) => {
        const { targetUser } = interaction;

        const pages = await getUserModerationLogPages(targetUser);
        replyButtonPages(interaction, pages, `Moderation Logs - ${targetUser.tag}`, undefined, undefined, true);
    },
};
