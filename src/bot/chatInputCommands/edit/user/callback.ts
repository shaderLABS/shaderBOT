import { PermissionFlagsBits } from 'discord.js';
import { ChatInputCommandCallback } from '../../../chatInputCommandHandler.js';
import { editApsect } from '../shared.js';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.KickMembers,
    callback: (interaction) => {
        const user = interaction.options.getUser('user', true);
        editApsect(interaction, user);
    },
};
