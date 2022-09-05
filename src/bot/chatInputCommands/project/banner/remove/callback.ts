import { ChannelType } from 'discord.js';
import { db } from '../../../../../db/postgres.js';
import { settings } from '../../../../bot.js';
import { ChatInputCommandCallback } from '../../../../chatInputCommandHandler.js';
import { replyError, replySuccess } from '../../../../lib/embeds.js';
import log from '../../../../lib/log.js';
import { parseUser } from '../../../../lib/misc.js';
import { isProjectOwner } from '../../../../lib/project.js';

export const command: ChatInputCommandCallback = {
    callback: async (interaction) => {
        const { channel, user } = interaction;

        if (channel.type !== ChannelType.GuildText) return replyError(interaction, 'This command is only usable in text channels.', 'Invalid Channel');
        if (!(await isProjectOwner(user.id, channel.id))) return replyError(interaction, 'You do not have permission to run this command.', 'Insufficient Permissions');
        if (channel.parentId && settings.data.archive.categoryIDs.includes(channel.parentId)) return replyError(interaction, 'This project is archived.');

        const { rowCount } = await db.query(/*sql*/ `UPDATE project SET banner_url = NULL WHERE channel_id = $1 AND banner_url IS NOT NULL;`, [channel.id]);
        if (rowCount === 0) return replyError(interaction, 'There is no banner image set.');

        replySuccess(interaction, 'Successfully removed the banner image.', 'Remove Project Banner');
        log(`${parseUser(interaction.user)} removed the banner image from their project <#${channel.id}>.`, 'Remove Project Banner');
    },
};
