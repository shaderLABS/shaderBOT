import { PermissionFlagsBits } from 'discord.js';
import type { ChatInputCommandCallback } from '../../../chatInputCommandHandler.ts';
import { editApsect } from '../shared.ts';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.KickMembers,
    callback: (interaction) => {
        const user = interaction.options.getUser('user', true);
        editApsect(interaction, user);
    },
};
