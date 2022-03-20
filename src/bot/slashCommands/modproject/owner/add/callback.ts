import { GuildMember } from 'discord.js';
import { db } from '../../../../../db/postgres.js';
import { settings } from '../../../../bot.js';
import { GuildCommandInteraction } from '../../../../events/interactionCreate.js';
import { replyError, replySuccess } from '../../../../lib/embeds.js';
import log from '../../../../lib/log.js';
import { ensureTextChannel, parseUser } from '../../../../lib/misc.js';
import { isProject, ownerOverwrites } from '../../../../lib/project.js';
import { ApplicationCommandCallback } from '../../../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: ['MANAGE_CHANNELS'],
    callback: async (interaction: GuildCommandInteraction) => {
        const { channel } = interaction;
        if (!ensureTextChannel(channel, interaction) || !(await isProject(channel.id))) return replyError(interaction, 'No project has been set up for this channel.');
        if (channel.parentId && settings.archive.categoryIDs.includes(channel.parentId)) return replyError(interaction, 'This project is archived.');

        const targetMember = interaction.options.getMember('user', false);
        if (!(targetMember instanceof GuildMember)) return replyError(interaction, 'The specified user is not a member of this guild.');

        const owners: string[] = (await db.query(/*sql*/ `SELECT owners::TEXT[] FROM project WHERE channel_id = $1 LIMIT 1;`, [channel.id])).rows[0]?.owners || [];

        if (owners.includes(targetMember.id)) return replyError(interaction, 'The specified member is already an owner.');

        await db.query(/*sql*/ `UPDATE project SET owners = $1 WHERE channel_id = $2;`, [[...owners, targetMember.id], channel.id]);
        channel.permissionOverwrites.create(targetMember, ownerOverwrites);

        replySuccess(interaction, `Successfully added ${parseUser(targetMember.user)} to the owners of the project linked to this channel.`, 'Add Project Owner');
        log(`${parseUser(interaction.user)} added ${parseUser(targetMember.user)} to the owners of the project linked to <#${channel.id}>.`, 'Add Project Owner');
    },
};
