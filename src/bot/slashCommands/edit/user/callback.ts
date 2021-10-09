import { GuildCommandInteraction } from '../../../events/interactionCreate.js';
import { ApplicationCommandCallback } from '../../../slashCommandHandler.js';
import { editApsect } from '../shared.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: ['KICK_MEMBERS'],
    callback: (interaction: GuildCommandInteraction) => {
        const user = interaction.options.getUser('user', true);
        editApsect(interaction, user);
    },
};
