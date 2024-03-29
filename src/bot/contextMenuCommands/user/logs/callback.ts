import { PermissionFlagsBits } from 'discord.js';
import { getUserModerationLogPages } from '../../../chatInputCommands/logs/callback.js';
import { UserContextMenuCommandCallback } from '../../../contextMenuCommandHandler.js';
import { replyButtonPages } from '../../../lib/embeds.js';

export const command: UserContextMenuCommandCallback = {
    commandName: 'Logs',
    requiredPermissions: PermissionFlagsBits.KickMembers,
    callback: async (interaction) => {
        const { targetUser } = interaction;

        const { pages, quickInformation } = await getUserModerationLogPages(targetUser);
        replyButtonPages(interaction, pages, `Moderation Logs - ${targetUser.username}`, undefined, undefined, true, quickInformation);
    },
};
