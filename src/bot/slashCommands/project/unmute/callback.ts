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

        if (!(await isProjectOwner(user.id, channel.id))) return replyError(interaction, 'You do not have permission to run this command.');
        if (channel.parentId && settings.archiveCategoryIDs.includes(channel.parentId)) return replyError(interaction, 'This project is archived.');

        const targetUser = interaction.options.getUser('user', true);

        const currentOverwrite = channel.permissionOverwrites.cache.get(targetUser.id);
        if (!currentOverwrite || !currentOverwrite.deny.has('SEND_MESSAGES') || !currentOverwrite.deny.has('ADD_REACTIONS')) return replyError(interaction, 'The specified user is not muted.');

        if (currentOverwrite.allow.equals(0n) && currentOverwrite.deny.equals(['SEND_MESSAGES', 'ADD_REACTIONS'])) currentOverwrite.delete();
        else currentOverwrite.edit({ SEND_MESSAGES: null, ADD_REACTIONS: null });

        log(`${parseUser(user)} unmuted ${parseUser(targetUser)} in their project (<#${channel.id}>).`, 'Unmute');
        replySuccess(interaction, `Successfully unmuted ${parseUser(targetUser)} in this project.`, 'Unmute');
    },
};
