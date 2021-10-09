import uuid from 'uuid-random';
import { GuildCommandInteraction } from '../../../events/interactionCreate.js';
import { replyError } from '../../../lib/embeds.js';
import { ApplicationCommandCallback } from '../../../slashCommandHandler.js';
import { deleteLogEntry } from '../shared.js';

export const command: ApplicationCommandCallback = {
    callback: (interaction: GuildCommandInteraction) => {
        const id = interaction.options.getString('id', true);
        if (!uuid.test(id)) return replyError(interaction, 'The specified UUID is invalid.');
        deleteLogEntry(id, interaction);
    },
};
