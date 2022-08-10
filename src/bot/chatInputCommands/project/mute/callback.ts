import { ChannelType } from 'discord.js';
import { db } from '../../../../db/postgres.js';
import { settings } from '../../../bot.js';
import { ChatInputCommandCallback, GuildCommandInteraction } from '../../../chatInputCommandHandler.js';
import { replyError, replySuccess } from '../../../lib/embeds.js';
import log from '../../../lib/log.js';
import { parseUser } from '../../../lib/misc.js';

export const command: ChatInputCommandCallback = {
    callback: async (interaction: GuildCommandInteraction) => {
        const { channel, user } = interaction;
        if (channel.type !== ChannelType.GuildText) return replyError(interaction, 'This command is only usable in text channels.', 'Invalid Channel');

        const project = (await db.query(/*sql*/ `SELECT owners::TEXT[] FROM project WHERE channel_id = $1 AND $2 = ANY (owners) LIMIT 1;`, [channel.id, user.id])).rows[0];
        if (!project) return replyError(interaction, 'You do not have permission to run this command.');
        if (!project.owners) return replyError(interaction, 'Failed to query channel owners.');

        if (channel.parentId && settings.data.archive.categoryIDs.includes(channel.parentId)) return replyError(interaction, 'This project is archived.');

        const targetUser = interaction.options.getUser('user', true);
        if (project.owners.includes(targetUser.id)) return replyError(interaction, 'You can not mute a channel owner.');

        channel.permissionOverwrites.edit(targetUser, { SendMessages: false, AddReactions: false });

        log(`${parseUser(user)} muted ${parseUser(targetUser)} in their project (<#${channel.id}>).`, 'Project Mute');
        replySuccess(interaction, `Successfully muted ${parseUser(targetUser)} in this project.`, 'Project Mute');
    },
};
