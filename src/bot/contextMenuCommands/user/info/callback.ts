import { getUserInfoEmbed } from '../../../chatInputCommands/info/callback.js';
import { UserContextMenuCommandCallback } from '../../../contextMenuCommandHandler.js';
import { userToMember } from '../../../lib/misc.js';

export const command: UserContextMenuCommandCallback = {
    commandName: 'Info',
    callback: async (interaction) => {
        const { targetUser } = interaction;
        const targetMember = await userToMember(targetUser.id, interaction.guild);

        interaction.reply({ embeds: [getUserInfoEmbed(targetUser, targetMember)], ephemeral: true });
    },
};
