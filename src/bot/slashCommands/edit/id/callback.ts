import uuid from 'uuid-random';
import { GuildCommandInteraction } from '../../../events/interactionCreate.js';
import { replyError } from '../../../lib/embeds.js';
import { ApplicationCommandCallback } from '../../../slashCommandHandler.js';
import { editApsect } from '../shared.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: ['KICK_MEMBERS'],
    callback: (interaction: GuildCommandInteraction) => {
        const id = interaction.options.getString('id', true);
        if (!uuid.test(id)) return replyError(interaction, 'The specified UUID is invalid.');
        editApsect(interaction, id);
    },
};
