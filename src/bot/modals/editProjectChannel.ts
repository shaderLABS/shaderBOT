import { ChannelType } from 'discord.js';
import { client } from '../bot.js';
import { replyError, replyInfo, replySuccess } from '../lib/embeds.js';
import log from '../lib/log.js';
import { getAlphabeticalChannelPosition, parseUser } from '../lib/misc.js';
import { ModalSubmitCallback } from '../modalSubmitHandler.js';

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
            replyError(interaction, 'The channel name must be at least one character long.', 'Edit Project Channel');
            return;
        }

        const oldChannelDescription = channel.topic || '';
        channel.topic = interaction.fields.getTextInputValue('descriptionInput').trim();
        const channelDescriptionEdited = oldChannelDescription !== channel.topic;

        if (!channelNameEdited && !channelDescriptionEdited) {
            replyInfo(interaction, 'The channel was not edited because neither the name nor the description have been changed.', 'Edit Project Channel', undefined, undefined, true);
            return;
        }

        try {
            await channel.edit({
                topic: channelDescriptionEdited ? channel.topic : undefined,
                name: channelNameEdited ? channel.name : undefined,
                position: channelNameEdited ? getAlphabeticalChannelPosition(channel, channel.parent) : undefined,
            });
        } catch {
            replyError(interaction, 'Failed to edit the channel.', 'Edit Project Channel', false);
            return;
        }

        replySuccess(interaction, 'The channel has been edited.', 'Edit Project Channel');
        log(
            `${parseUser(interaction.user)} edited the their project project channel (<#${channel.id}>).\n\n**Before**\nName: ${oldChannelName}\nDescription: ${
                oldChannelDescription || 'No description.'
            }\n\n**After**\nName: ${channel.name}\nDescription: ${channel.topic || 'No description.'}`,
            'Edit Project Channel'
        );
    },
};
