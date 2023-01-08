import { ChannelType, PermissionFlagsBits, TextChannel } from 'discord.js';
import { db } from '../../../db/postgres.js';
import { client, settings } from '../../bot.js';
import { ChatInputCommandCallback } from '../../chatInputCommandHandler.js';
import { replyInfo } from '../../lib/embeds.js';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.ManageChannels,
    callback: async (interaction) => {
        await interaction.deferReply();

        const projectChannels = (await db.query({ text: /*sql*/ `SELECT channel_id FROM project WHERE role_id IS NOT NULL;`, name: 'project-all-unarchived-channel-id' })).rows;
        const eligibleProjectChannelPromises: Promise<TextChannel | undefined>[] = [];

        for (const { channel_id } of projectChannels) {
            const channel = client.channels.cache.get(channel_id);
            if (channel?.type !== ChannelType.GuildText) continue;

            eligibleProjectChannelPromises.push(
                channel.messages.fetch({ limit: settings.data.archive.minimumMessageCount }).then((messages) => {
                    const oldestMessage = messages.last();
                    if (!oldestMessage || Date.now() - oldestMessage.createdTimestamp > settings.data.archive.maximumMessageAge * 1000) return channel;
                })
            );
        }

        const eligibleProjectChannels = (await Promise.all(eligibleProjectChannelPromises)).filter((channel): channel is NonNullable<typeof channel> => channel !== undefined);

        replyInfo(
            interaction,
            eligibleProjectChannels.length === 0
                ? 'No project channels are currently eligible for archiving.'
                : eligibleProjectChannels
                      .sort((a, b) => a.name.replace(/[^\x00-\x7F]/g, '').localeCompare(b.name.replace(/[^\x00-\x7F]/g, ''), 'en'))
                      .reduce((list, channel) => list + channel.toString() + '\n', ''),
            'Archive Candidates'
        );
    },
};
