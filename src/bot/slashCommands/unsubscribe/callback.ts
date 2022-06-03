import { db } from '../../../db/postgres.js';
import { replyError, replySuccess } from '../../lib/embeds.js';
import { ApplicationCommandCallback, GuildCommandInteraction } from '../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    callback: async (interaction: GuildCommandInteraction) => {
        const { member, guild } = interaction;

        const projectChannel = interaction.options.getChannel('project', false) || interaction.channel;
        if (!projectChannel.isText()) return replyError(interaction, 'You must specify a text channel.');

        const project = (await db.query(/*sql*/ `SELECT id, role_id FROM project WHERE channel_id = $1 LIMIT 1;`, [projectChannel.id])).rows[0];
        if (!project) return replyError(interaction, `<#${projectChannel.id}> is not a project channel.`);
        if (!project.role_id) return replyError(interaction, `<#${projectChannel.id}> is archived.`);

        const role = await guild.roles.fetch(project.role_id);
        if (!role) return replyError(interaction, "Failed to resolve the project's role.", undefined, false);

        if (member.roles.cache.has(role.id)) {
            member.roles.remove(role);
            return replySuccess(interaction, `You will no longer receive notifications from <#${projectChannel.id}>.`, 'Unsubscribe', true);
        }

        return replyError(interaction, `You do not receive notifications from <#${projectChannel.id}>.\nYou can subscribe to notifications using \`/subscribe\`.`);
    },
};
