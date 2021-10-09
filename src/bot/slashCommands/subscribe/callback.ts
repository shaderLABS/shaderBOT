import { GuildChannel } from 'discord.js';
import { db } from '../../../db/postgres.js';
import { GuildCommandInteraction } from '../../events/interactionCreate.js';
import { replyError, replySuccess } from '../../lib/embeds.js';
import { isTextOrThreadChannel } from '../../lib/misc.js';
import { ApplicationCommandCallback } from '../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    callback: async (interaction: GuildCommandInteraction) => {
        const { member, guild } = interaction;

        const projectChannel = (interaction.options.getChannel('project', false) as GuildChannel | null) || interaction.channel;
        if (!isTextOrThreadChannel(projectChannel)) return replyError(interaction, 'You must specify a text or thread channel.');

        const project = (await db.query(/*sql*/ `SELECT role_id FROM project WHERE channel_id = $1 LIMIT 1;`, [projectChannel.id])).rows[0];
        if (!project) return replyError(interaction, `<#${projectChannel.id}> is not a project channel.`);

        const role = await guild.roles.fetch(project.role_id);
        if (!role) return replyError(interaction, "Failed to resolve the project's role.", undefined, false);

        if (!member.roles.cache.has(role.id)) {
            member.roles.add(role);
            return replySuccess(interaction, `You will now receive notifications from <#${projectChannel.id}>.`, 'Subscribe', true);
        }

        return replyError(interaction, `You already receive notifications from <#${projectChannel.id}>.\nYou can unsubscribe from notifications using \`/unsubscribe\`.`);
    },
};
