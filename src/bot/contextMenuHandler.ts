import { ChannelType, MessageContextMenuCommandInteraction } from 'discord.js';
import { settings } from './bot.js';
import { replyError, replySuccess } from './lib/embeds.js';
import { isProjectOwner } from './lib/project.js';

/***********
 * EXECUTE *
 ***********/

export async function handleMessageContextMenuCommand(interaction: MessageContextMenuCommandInteraction<'cached'>) {
    if (interaction.commandName === 'Pin/Unpin Message') {
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

        replySuccess(interaction, wasPinned ? 'Successfully unpinned message.' : 'Successfully pinned message.', undefined, true);
    }
}
