import { ApplicationCommandCallback, GuildCommandInteraction } from '../../../slashCommandHandler.js';
import { editApsect } from '../shared.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: ['KickMembers'],
    callback: (interaction: GuildCommandInteraction) => {
        const user = interaction.options.getUser('user', true);
        editApsect(interaction, user);
    },
};
