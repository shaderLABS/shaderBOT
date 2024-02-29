import { getUserInfoEmbed } from '../../../chatInputCommands/info/callback.ts';
import type { UserContextMenuCommandCallback } from '../../../contextMenuCommandHandler.ts';
import { userToMember } from '../../../lib/misc.ts';

export const command: UserContextMenuCommandCallback = {
    commandName: 'Info',
    callback: async (interaction) => {
        const { targetUser } = interaction;
        const targetMember = await userToMember(targetUser.id, interaction.guild);

        interaction.reply({ embeds: [getUserInfoEmbed(targetUser, targetMember)], ephemeral: true });
    },
};
