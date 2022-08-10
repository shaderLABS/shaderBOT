import { ChannelType, PermissionFlagsBits } from 'discord.js';
import { db } from '../../../../db/postgres.js';
import { replyError, replySuccess } from '../../../lib/embeds.js';
import log from '../../../lib/log.js';
import { parseUser } from '../../../lib/misc.js';
import { ApplicationCommandCallback, GuildCommandInteraction } from '../../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: PermissionFlagsBits.ManageChannels,
    callback: async (interaction: GuildCommandInteraction) => {
        const { channel } = interaction;
        if (channel.type !== ChannelType.GuildText) return replyError(interaction, 'This command is only usable in text channels.', 'Invalid Channel');

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
