import { ChannelType } from 'discord.js';
import { client } from '../bot.ts';
import { replyError, replyInfo, replySuccess } from '../lib/embeds.ts';
import log from '../lib/log.ts';
import { getAlphabeticalChannelPosition, parseUser } from '../lib/misc.ts';
import type { ModalSubmitCallback } from '../modalSubmitHandler.ts';

export const modal: ModalSubmitCallback = {
    customID: 'editProjectChannel',
    callback: async (interaction, channelID) => {
        if (!channelID) return;

        const channel = client.channels.cache.get(channelID);
        if (channel?.type !== ChannelType.GuildText) return;

        const oldChannelName = channel.name;
        channel.name = interaction.fields.getTextInputValue('nameInput').trim();
        const channelNameEdited = oldChannelName !== channel.name;

        if (!channel.name) {
            replyError(interaction, {
                description: 'The channel name must be at least one character long.',
                title: 'Edit Project Channel',
            });
            return;
        }

        const oldChannelDescription = channel.topic || '';
        channel.topic = interaction.fields.getTextInputValue('descriptionInput').trim();
        const channelDescriptionEdited = oldChannelDescription !== channel.topic;

        if (!channelNameEdited && !channelDescriptionEdited) {
            replyInfo(
                interaction,
                {
                    description: 'The channel was not edited because neither the name nor the description have been changed.',
                    title: 'Edit Project Channel',
                },
                true,
            );
            return;
        }

        try {
            await channel.edit({
                topic: channelDescriptionEdited ? channel.topic : undefined,
                name: channelNameEdited ? channel.name : undefined,
                position: channelNameEdited ? getAlphabeticalChannelPosition(channel, channel.parent) : undefined,
            });
        } catch {
            replyError(interaction, { description: 'Failed to edit the channel.', title: 'Edit Project Channel' }, false);
            return;
        }

        replySuccess(interaction, {
            description: 'The channel has been edited.',
            title: 'Edit Project Channel',
        });
        log(
            `${parseUser(interaction.user)} edited the their project project channel (<#${channel.id}>).\n\n**Before**\nName: ${oldChannelName}\nDescription: ${
                oldChannelDescription || 'No description.'
            }\n\n**After**\nName: ${channel.name}\nDescription: ${channel.topic || 'No description.'}`,
            'Edit Project Channel',
        );
    },
};
