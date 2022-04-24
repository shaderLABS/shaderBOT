import { db } from '../../../../db/postgres.js';
import { replyError, replySuccess } from '../../../lib/embeds.js';
import { ApplicationCommandCallback, GuildCommandInteraction } from '../../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    callback: async (interaction: GuildCommandInteraction) => {
        const { channel } = interaction;

        const project = (await db.query(/*sql*/ `SELECT id, role_id FROM project WHERE channel_id = $1 AND $2 = ANY (owners) LIMIT 1`, [channel.id, interaction.user.id])).rows[0];
        if (!project) return replyError(interaction, 'You do not have permission to run this command.', 'Insufficient Permissions');
        if (!project.role_id) return replyError(interaction, 'This project is archived.');

        await channel.send('<@&' + project.role_id + '>');
        replySuccess(interaction, 'Successfully pinged all users that are subscribed to this project.', 'Project Ping', true);
    },
};
