import { db } from '../../../../db/postgres.js';
import { settings } from '../../../bot.js';
import { GuildCommandInteraction } from '../../../events/interactionCreate.js';
import { replyError, replySuccess } from '../../../lib/embeds.js';
import log from '../../../lib/log.js';
import { ensureTextChannel, parseUser } from '../../../lib/misc.js';
import { ApplicationCommandCallback } from '../../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    callback: async (interaction: GuildCommandInteraction) => {
        const { channel, user } = interaction;
        if (!ensureTextChannel(channel, interaction)) return;

        const project = (await db.query(/*sql*/ `SELECT owners::TEXT[] FROM project WHERE channel_id = $1 AND $2 = ANY (owners) LIMIT 1;`, [channel.id, user.id])).rows[0];
        if (!project) return replyError(interaction, 'You do not have permission to run this command.');
        if (!project.owners) return replyError(interaction, 'Failed to query channel owners.');

        if (channel.parentId && settings.archiveCategoryIDs.includes(channel.parentId)) return replyError(interaction, 'This project is archived.');

        const targetUser = interaction.options.getUser('user', true);
        if (project.owners.includes(targetUser.id)) return replyError(interaction, 'You can not mute a channel owner.');

        channel.permissionOverwrites.edit(targetUser, { SEND_MESSAGES: false, ADD_REACTIONS: false });

        log(`${parseUser(user)} muted ${parseUser(targetUser)} in their project (<#${channel.id}>).`, 'Mute');
        replySuccess(interaction, `Successfully muted ${parseUser(targetUser)} in this project.`, 'Mute');
    },
};
