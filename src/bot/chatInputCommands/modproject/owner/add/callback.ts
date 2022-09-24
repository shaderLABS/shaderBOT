import { GuildMember, PermissionFlagsBits } from 'discord.js';
import { ChatInputCommandCallback } from '../../../../chatInputCommandHandler.js';
import { replyError, replySuccess } from '../../../../lib/embeds.js';
import { Project } from '../../../../lib/project.js';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.ManageChannels,
    callback: async (interaction) => {
        const targetMember = interaction.options.getMember('user');
        if (!(targetMember instanceof GuildMember)) return replyError(interaction, 'The specified user is not a member of this guild.');

        try {
            const project = await Project.getByChannelID(interaction.channelId);
            const logString = await project.addOwner(targetMember, interaction.user.id);
            replySuccess(interaction, logString, 'Add Project Owner');
        } catch (error) {
            replyError(interaction, error);
        }
    },
};
