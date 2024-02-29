import { GuildMember, PermissionFlagsBits } from 'discord.js';
import type { ChatInputCommandCallback } from '../../../../chatInputCommandHandler.ts';
import { replyError, replySuccess } from '../../../../lib/embeds.ts';
import { Project } from '../../../../lib/project.ts';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.ManageChannels,
    callback: async (interaction) => {
        const targetMember = interaction.options.getMember('user');
        if (!(targetMember instanceof GuildMember)) {
            replyError(interaction, 'The specified user is not a member of this guild.');
            return;
        }

        try {
            const project = await Project.getByChannelID(interaction.channelId);
            const logString = await project.addOwner(targetMember, interaction.user.id);
            replySuccess(interaction, logString, 'Add Project Owner');
        } catch (error) {
            replyError(interaction, String(error));
        }
    },
};
