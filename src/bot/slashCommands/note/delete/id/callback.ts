import uuid from 'uuid-random';
import { db } from '../../../../../db/postgres.js';
import { GuildCommandInteraction } from '../../../../events/interactionCreate.js';
import { replyError } from '../../../../lib/embeds.js';
import { ApplicationCommandCallback } from '../../../../slashCommandHandler.js';
import { deleteNote } from '../shared.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: ['KICK_MEMBERS'],
    callback: async (interaction: GuildCommandInteraction) => {
        const id = interaction.options.getString('id', true);
        if (!uuid.test(id)) return replyError(interaction, 'The specified UUID is invalid.');

        const note = (await db.query(/*sql*/ `SELECT id, user_id, mod_id, content, context_url, timestamp, edited_mod_id, edited_timestamp FROM note WHERE id = $1;`, [id])).rows[0];
        if (!note) return replyError(interaction, 'There is no note with the specified UUID.');

        deleteNote(interaction, note);
    },
};
