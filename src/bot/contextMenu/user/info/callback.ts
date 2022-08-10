import { UserContextMenuCommandCallback } from '../../../contextMenuCommandHandler.js';
import { userToMember } from '../../../lib/misc.js';
import { getUserInfoEmbed } from '../../../slashCommands/info/callback.js';

export const command: UserContextMenuCommandCallback = {
    commandName: 'Info',
    callback: async (interaction) => {
        const { targetUser } = interaction;
        const targetMember = await userToMember(interaction.guild, targetUser.id);

        interaction.reply({ embeds: [getUserInfoEmbed(targetUser, targetMember)], ephemeral: true });
    },
};
