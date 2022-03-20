import { settings } from '../../../bot.js';
import { GuildCommandInteraction } from '../../../events/interactionCreate.js';
import { replyError, replySuccess } from '../../../lib/embeds.js';
import log from '../../../lib/log.js';
import { ensureTextChannel, getAlphabeticalChannelPosition, parseUser } from '../../../lib/misc.js';
import { isProjectOwner } from '../../../lib/project.js';
import { ApplicationCommandCallback } from '../../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    callback: async (interaction: GuildCommandInteraction) => {
        const { channel, user } = interaction;

        if (!ensureTextChannel(channel, interaction) || !(await isProjectOwner(user.id, channel.id))) return replyError(interaction, 'You do not have permission to run this command.', 'Insufficient Permissions');
        if (channel.parentId && settings.archive.categoryIDs.includes(channel.parentId)) return replyError(interaction, 'This project is archived.');

        const newName = interaction.options.getString('value', true);
        if (newName.length < 2 || newName.length > 32) return replyError(interaction, 'Channel names must be between 2 and 32 characters long.');

        const oldName = channel.name;
        channel.name = newName;

        try {
            await channel.edit({ name: newName, position: getAlphabeticalChannelPosition(channel, channel.parent) });
        } catch {
            return replyError(interaction, 'Failed to edit the name of this channel.');
        }

        log(`${parseUser(user)} edited the name of their project (<#${channel.id}>) from:\n\n${oldName}\n\nto:\n\n${newName}`, 'Edit Project Name');
        replySuccess(interaction, 'Successfully edited the name of this channel.', 'Edit Project Name');
    },
};
