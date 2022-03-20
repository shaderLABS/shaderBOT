import { db } from '../../../../db/postgres.js';
import { GuildCommandInteraction } from '../../../events/interactionCreate.js';
import { replyError, replySuccess } from '../../../lib/embeds.js';
import log from '../../../lib/log.js';
import { ensureTextChannel, parseUser } from '../../../lib/misc.js';
import { ApplicationCommandCallback } from '../../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: ['MANAGE_CHANNELS'],
    callback: async (interaction: GuildCommandInteraction) => {
        const { channel } = interaction;
        if (!ensureTextChannel(channel, interaction)) return replyError(interaction, 'You can not turn thread channels into projects.');

        const project = (await db.query(/*sql*/ `DELETE FROM project WHERE channel_id = $1 RETURNING id, role_id;`, [channel.id])).rows[0];
        if (!project) return replyError(interaction, 'No project has been set up for this channel.');

        channel.lockPermissions();

        if (project.role_id) {
            const role = await channel.guild.roles.fetch(project.role_id).catch(() => undefined);
            if (role) role.delete();
        }

        replySuccess(interaction, 'Successfully deleted the project linked to this channel.', 'Delete Project');
        log(`${parseUser(interaction.user)} deleted the project linked to <#${channel.id}>.`, 'Delete Project');
    },
};
