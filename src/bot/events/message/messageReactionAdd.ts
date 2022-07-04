import { ChannelType, MessageReaction, User } from 'discord.js';
import { settings } from '../../bot.js';
import { Event } from '../../eventHandler.js';
import { sendError } from '../../lib/embeds.js';
import { isProjectOwner } from '../../lib/project.js';

export const event: Event = {
    name: 'messageReactionAdd',
    callback: async (reaction: MessageReaction, user: User) => {
        // *always* safe to access, even if partial
        const channel = reaction.message.channel;
        if (channel.type !== ChannelType.GuildText || user.bot || !channel.parentId) return;

        if (!settings.data.archive.categoryIDs.includes(channel.parentId) && (await isProjectOwner(user.id, channel.id))) {
            // PROJECT CHANNEL

            if (reaction.emoji.name === '📌') {
                try {
                    const reactionMessage = await reaction.message.fetch();

                    if (reactionMessage.pinned) await reactionMessage.unpin();
                    else await reactionMessage.pin();

                    await reaction.users.remove(user);
                } catch {
                    sendError(channel, 'Failed to (un)pin message. You can only pin up to 50 messages.');
                }
            }
        }
    },
};
