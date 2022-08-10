import { ChannelType, PermissionFlagsBits } from 'discord.js';
import { settings } from '../../../bot.js';
import { MessageContextMenuCommandCallback } from '../../../contextMenuCommandHandler.js';
import { replyError, replySuccess } from '../../../lib/embeds.js';
import { isProjectOwner } from '../../../lib/project.js';

export const command: MessageContextMenuCommandCallback = {
    commandName: 'Pin/Unpin',
    requiredPermissions: PermissionFlagsBits.ManageWebhooks,
    permissionOverwrites: true,
    callback: async (interaction) => {
        const { targetMessage, channel } = interaction;
        if (channel?.type !== ChannelType.GuildText) return replyError(interaction, 'The message was not sent in a text channel.');

        if (!(await isProjectOwner(interaction.user.id, channel.id))) return replyError(interaction, undefined, 'Insufficient Permissions');
        if (channel.parentId && settings.data.archive.categoryIDs.includes(channel.parentId)) return replyError(interaction, 'This project is archived.');

        const wasPinned = targetMessage.pinned;

        try {
            if (wasPinned) await targetMessage.unpin();
            else await targetMessage.pin();
        } catch {
            replyError(interaction, wasPinned ? 'Failed to unpin message.' : 'Failed to pin message. You can only pin up to 50 messages.');
        }

        replySuccess(interaction, undefined, `Successfully ${wasPinned ? 'unpinned' : 'pinned'} the message.`, true);
    },
};
