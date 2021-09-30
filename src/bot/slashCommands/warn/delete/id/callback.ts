import uuid from 'uuid-random';
import { db } from '../../../../../db/postgres.js';
import { GuildCommandInteraction } from '../../../../events/interactionCreate.js';
import { replyError } from '../../../../lib/embeds.js';
import { ApplicationCommandCallback } from '../../../../slashCommandHandler.js';
import { deleteWarning } from '../shared.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: ['KICK_MEMBERS'],
    callback: async (interaction: GuildCommandInteraction) => {
        const id = interaction.options.getString('id', true);
        if (!uuid.test(id)) return replyError(interaction, 'The specified UUID is invalid.');

        const warning = (await db.query(/*sql*/ `SELECT id, user_id, mod_id, context_url, severity, reason FROM warn WHERE id = $1;`, [id])).rows[0];
        if (!warning) return replyError(interaction, 'There is no warning with the specified UUID.');

        deleteWarning(interaction, warning);
    },
};
