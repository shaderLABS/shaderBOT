import { db } from '../../../../../db/postgres.js';
import { settings } from '../../../../bot.js';
import { GuildCommandInteraction } from '../../../../events/interactionCreate.js';
import { replyError, replySuccess } from '../../../../lib/embeds.js';
import log from '../../../../lib/log.js';
import { ensureTextChannel, parseUser, userToMember } from '../../../../lib/misc.js';
import { isProject } from '../../../../lib/project.js';
import { ApplicationCommandCallback } from '../../../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    requiredPermissions: ['MANAGE_CHANNELS'],
    callback: async (interaction: GuildCommandInteraction) => {
        const { channel } = interaction;
        if (!ensureTextChannel(channel, interaction) || !(await isProject(channel.id))) return replyError(interaction, 'No project has been set up for this channel.');
        if (channel.parentId && settings.archive.categoryIDs.includes(channel.parentId)) return replyError(interaction, 'This project is archived.');

        const targetUser = interaction.options.getUser('user', true);
        const targetMember = await userToMember(interaction.guild, targetUser.id);

        const oldOwners: string[] = (await db.query(/*sql*/ `SELECT owners::TEXT[] FROM project WHERE channel_id = $1 LIMIT 1;`, [channel.id])).rows[0]?.owners || [];
        const newOwners = oldOwners.filter((owner) => owner != targetUser.id);

        if (oldOwners.length == newOwners.length) return replyError(interaction, 'The specified user is not an owner.');

        await db.query(/*sql*/ `UPDATE project SET owners = $1 WHERE channel_id = $2;`, [newOwners, channel.id]);
        if (targetMember) channel.permissionOverwrites.delete(targetMember);

        replySuccess(interaction, `Successfully removed ${parseUser(targetUser)} from the owners of the project linked to this channel.`, 'Remove Project Owner');
        log(`${parseUser(interaction.user)} removed ${parseUser(targetUser)} from the owners of the project linked to <#${channel.id}>.`, 'Remove Project Owner');
    },
};
