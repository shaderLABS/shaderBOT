import { db } from '../../../../db/postgres.js';
import { GuildCommandInteraction } from '../../../events/interactionCreate.js';
import { replyError } from '../../../lib/embeds.js';
import { ApplicationCommandCallback } from '../../../slashCommandHandler.js';
import { deleteLogEntry } from '../shared.js';

export const command: ApplicationCommandCallback = {
    callback: async (interaction: GuildCommandInteraction) => {
        const targetUser = interaction.options.getUser('user', true);
        const id = (await db.query(/*sql*/ `SELECT id FROM past_punishment WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 1;`, [targetUser.id])).rows[0]?.id;
        if (!id) return replyError(interaction, 'The specified user does not have any log entries.');
        deleteLogEntry(id, interaction);
    },
};
