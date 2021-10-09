import { db } from '../../../../../db/postgres.js';
import { GuildCommandInteraction } from '../../../../events/interactionCreate.js';
import { replyError } from '../../../../lib/embeds.js';
import { ApplicationCommandCallback } from '../../../../slashCommandHandler.js';
import { deleteNote } from '../shared.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: ['KICK_MEMBERS'],
    callback: async (interaction: GuildCommandInteraction) => {
        const targetUser = interaction.options.getUser('user', true);

        const note = (
            await db.query(/*sql*/ `SELECT id, user_id, mod_id, content, context_url, timestamp, edited_mod_id, edited_timestamp FROM note WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 1;`, [
                targetUser.id,
            ])
        ).rows[0];
        if (!note) return replyError(interaction, 'The specified user does not have any notes.');

        deleteNote(interaction, note);
    },
};
