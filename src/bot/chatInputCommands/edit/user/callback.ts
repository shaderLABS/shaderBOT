import { PermissionFlagsBits } from 'discord.js';
import { ChatInputCommandCallback, GuildCommandInteraction } from '../../../chatInputCommandHandler.js';
import { editApsect } from '../shared.js';

export const command: ChatInputCommandCallback = {
    requiredPermissions: PermissionFlagsBits.KickMembers,
    callback: (interaction: GuildCommandInteraction) => {
        const user = interaction.options.getUser('user', true);
        editApsect(interaction, user);
    },
};
