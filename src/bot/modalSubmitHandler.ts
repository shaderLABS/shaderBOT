import { ModalSubmitInteraction } from 'discord.js';
import { replyError, replyInfo, replySuccess } from './lib/embeds.js';
import log from './lib/log.js';
import { getAlphabeticalChannelPosition, parseUser } from './lib/misc.js';

export async function handleModalSubmit(interaction: ModalSubmitInteraction) {
    if (interaction.customId.startsWith('editProjectChannel')) {
        const channelID = interaction.customId.split(':')[1];
        if (!channelID) return;

        const channel = interaction.guild?.channels.cache.get(channelID);
        if (!channel?.isText()) return;

        const oldChannelName = channel.name;
        channel.name = interaction.fields.getTextInputValue('nameInput').trim();
        const channelNameEdited = oldChannelName !== channel.name;

        if (!channel.name) {
            return replyError(interaction, 'The channel name must be at least one character long.', 'Edit Project Channel');
        }

        const oldChannelDescription = channel.topic || '';
        channel.topic = interaction.fields.getTextInputValue('descriptionInput').trim();
        const channelDescriptionEdited = oldChannelDescription !== channel.topic;

        if (!channelNameEdited && !channelDescriptionEdited) {
            return replyInfo(interaction, 'The channel was not edited because neither the name nor the description have been changed.', 'Edit Project Channel', undefined, undefined, true);
        }

        try {
            await channel.edit({
                topic: channelDescriptionEdited ? channel.topic : undefined,
                name: channelNameEdited ? channel.name : undefined,
                position: channelNameEdited ? getAlphabeticalChannelPosition(channel, channel.parent) : undefined,
            });
        } catch {
            return replyError(interaction, 'Failed to edit the channel.', 'Edit Project Channel', false);
        }

        replySuccess(interaction, 'Successfully edited the channel.', 'Edit Project Channel');
        log(
            `${parseUser(interaction.user)} edited the their project project channel (<#${channel.id}>).\n\n**Before**\nName: ${oldChannelName}\nDescription: ${
                oldChannelDescription || 'No description.'
            }\n\n**After**\nName: ${channel.name}\nDescription: ${channel.topic || 'No description.'}`,
            'Edit Project Channel'
        );
    }
}
