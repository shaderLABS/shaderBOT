import { ChannelType, PermissionFlagsBits } from 'discord.js';
import { settings } from '../../../bot.js';
import { replyError, replySuccess } from '../../../lib/embeds.js';
import log from '../../../lib/log.js';
import { parseUser } from '../../../lib/misc.js';
import { isProjectOwner } from '../../../lib/project.js';
import { ApplicationCommandCallback, GuildCommandInteraction } from '../../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    callback: async (interaction: GuildCommandInteraction) => {
        const { channel, user } = interaction;

        if (channel.type !== ChannelType.GuildText) return replyError(interaction, 'This command is only usable in text channels.', 'Invalid Channel');
        if (!(await isProjectOwner(user.id, channel.id))) return replyError(interaction, 'You do not have permission to run this command.');
        if (channel.parentId && settings.data.archive.categoryIDs.includes(channel.parentId)) return replyError(interaction, 'This project is archived.');

        const targetUser = interaction.options.getUser('user', true);

        const currentOverwrite = channel.permissionOverwrites.cache.get(targetUser.id);
        if (!currentOverwrite || !currentOverwrite.deny.has(PermissionFlagsBits.SendMessages) || !currentOverwrite.deny.has(PermissionFlagsBits.AddReactions)) {
            return replyError(interaction, 'The specified user is not muted.');
        }

        if (currentOverwrite.allow.equals(0n) && currentOverwrite.deny.equals([PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions])) currentOverwrite.delete();
        else currentOverwrite.edit({ SendMessages: null, AddReactions: null });

        log(`${parseUser(user)} unmuted ${parseUser(targetUser)} in their project (<#${channel.id}>).`, 'Project Unmute');
        replySuccess(interaction, `Successfully unmuted ${parseUser(targetUser)} in this project.`, 'Project Unmute');
    },
};
