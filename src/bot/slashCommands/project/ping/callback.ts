import { db } from '../../../../db/postgres.js';
import { settings } from '../../../bot.js';
import { GuildCommandInteraction } from '../../../events/interactionCreate.js';
import { replyError } from '../../../lib/embeds.js';
import { ApplicationCommandCallback } from '../../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    callback: async (interaction: GuildCommandInteraction) => {
        const { channel } = interaction;

        const project = (await db.query(/*sql*/ `SELECT role_id FROM project WHERE channel_id = $1 AND $2 = ANY (owners) LIMIT 1`, [channel.id, interaction.user.id])).rows[0];

        if (project?.role_id) {
            if (channel.parentId && settings.archiveCategoryIDs.includes(channel.parentId)) return replyError(interaction, 'This project is archived.');
            interaction.reply('<@&' + project.role_id + '>');
        } else {
            replyError(interaction, 'You do not have permission to run this command.', 'Insufficient Permissions');
        }
    },
};
