import { db } from '../../../../../db/postgres.js';
import { GuildCommandInteraction } from '../../../../events/interactionCreate.js';
import { replyError } from '../../../../lib/embeds.js';
import { ApplicationCommandCallback } from '../../../../slashCommandHandler.js';
import { deleteWarning } from '../shared.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: ['KICK_MEMBERS'],
    callback: async (interaction: GuildCommandInteraction) => {
        const targetUser = interaction.options.getUser('user', true);

        const warning = (await db.query(/*sql*/ `SELECT id, user_id, mod_id, context_url, severity, reason FROM warn WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 1;`, [targetUser.id])).rows[0];
        if (!warning) return replyError(interaction, 'The specified user does not have any warnings.');

        deleteWarning(interaction, warning);
    },
};
