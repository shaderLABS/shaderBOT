import { db } from '../../../../../db/postgres.js';
import { settings } from '../../../../bot.js';
import { replyError, replySuccess } from '../../../../lib/embeds.js';
import log from '../../../../lib/log.js';
import { parseUser } from '../../../../lib/misc.js';
import { isProjectOwner } from '../../../../lib/project.js';
import { ApplicationCommandCallback, GuildCommandInteraction } from '../../../../slashCommandHandler.js';

export const command: ApplicationCommandCallback = {
    callback: async (interaction: GuildCommandInteraction) => {
        const { channel, user } = interaction;

        if (!channel.isText()) return replyError(interaction, 'This command is only usable in text channels.', 'Invalid Channel');
        if (!(await isProjectOwner(user.id, channel.id))) return replyError(interaction, 'You do not have permission to run this command.', 'Insufficient Permissions');
        if (channel.parentId && settings.data.archive.categoryIDs.includes(channel.parentId)) return replyError(interaction, 'This project is archived.');

        const { rowCount } = await db.query(/*sql*/ `UPDATE project SET banner_url = NULL WHERE channel_id = $1 AND banner_url IS NOT NULL;`, [channel.id]);
        if (rowCount === 0) return replyError(interaction, 'There is no banner image set.');

        replySuccess(interaction, 'Successfully removed the banner image.');
        log(`${parseUser(interaction.user)} removed the banner image from their project <#${channel.id}>.`);
    },
};
