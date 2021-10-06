import { settings } from '../../../bot.js';
import { GuildCommandInteraction } from '../../../events/interactionCreate.js';
import { replyError, replySuccess } from '../../../lib/embeds.js';
import log from '../../../lib/log.js';
import { ensureTextChannel, parseUser } from '../../../lib/misc.js';
import { isProjectOwner } from '../../../lib/project.js';
import { ApplicationCommandCallback } from '../../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    callback: async (interaction: GuildCommandInteraction) => {
        const { channel, user } = interaction;
        if (!ensureTextChannel(channel, interaction)) return;

        if (!(await isProjectOwner(user.id, channel.id))) return replyError(interaction, 'You do not have permission to run this command.', 'Insufficient Permissions');
        if (channel.parentId && settings.archiveCategoryIDs.includes(channel.parentId)) return replyError(interaction, 'This project is archived.');

        const newDescription = interaction.options.getString('value', false) || undefined;
        if (newDescription && newDescription.length > 1024) return replyError(interaction, 'Channel descriptions must be less than 32 characters long.');

        log(
            `${parseUser(user)} edited the description of their project (<#${channel.id}>) from:\n\n${channel.topic || 'No description.'}\n\nto:\n\n${newDescription || 'No description.'}`,
            'Edit Project Description'
        );
        channel.edit({ topic: newDescription });
        replySuccess(interaction, 'Successfully edited the description of this channel.', 'Edit Project Description');
    },
};
